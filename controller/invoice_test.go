package controller

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func TestInvoiceDatabaseAndWorkflow(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			var driver gorm.Dialector
			switch dialect {
			case "sqlite":
				driver = sqlite.Open(":memory:")
			case "mysql":
				if os.Getenv("TEST_MYSQL_DSN") == "" {
					t.Skip("TEST_MYSQL_DSN not configured")
				}
				driver = mysql.Open(os.Getenv("TEST_MYSQL_DSN"))
			case "postgres":
				if os.Getenv("TEST_POSTGRES_DSN") == "" {
					t.Skip("TEST_POSTGRES_DSN not configured")
				}
				driver = postgres.Open(os.Getenv("TEST_POSTGRES_DSN"))
			}
			db, err := gorm.Open(driver, &gorm.Config{NamingStrategy: schema.NamingStrategy{TablePrefix: "invoice_test_"}})
			require.NoError(t, err)
			previous := model.DB
			model.DB = db
			tables := []any{&model.TopUp{}, &model.InvoiceConfig{}, &model.Invoice{}, &model.InvoiceOrderClaim{}, &model.InvoiceOrder{}, &model.InvoiceFile{}}
			t.Cleanup(func() {
				model.DB = previous
				require.NoError(t, db.Migrator().DropTable(tables...))
				sqlDB, _ := db.DB()
				_ = sqlDB.Close()
			})
			var version string
			versionSQL := "SELECT version()"
			if dialect == "sqlite" {
				versionSQL = "SELECT sqlite_version()"
			}
			require.NoError(t, db.Raw(versionSQL).Scan(&version).Error)
			t.Logf("%s version: %s", dialect, version)
			// Existing TopUp schema plus representative paid orders survives upgrade.
			require.NoError(t, db.AutoMigrate(&model.TopUp{}))
			orders := []model.TopUp{
				{UserId: 7, Money: 300.01, TradeNo: "paid-one", PaymentProvider: model.PaymentProviderEpay, Status: common.TopUpStatusSuccess},
				{UserId: 7, Money: 200.02, TradeNo: "paid-two", PaymentProvider: model.PaymentProviderEpay, Status: common.TopUpStatusSuccess},
				{UserId: 8, Money: 900, TradeNo: "other-user", PaymentProvider: model.PaymentProviderEpay, Status: common.TopUpStatusSuccess},
				{UserId: 7, Money: 900, TradeNo: "unpaid", PaymentProvider: model.PaymentProviderEpay, Status: common.TopUpStatusPending},
				{UserId: 7, Money: 900, TradeNo: "usd", PaymentProvider: model.PaymentProviderStripe, Status: common.TopUpStatusSuccess},
			}
			require.NoError(t, db.Create(&orders).Error)
			for range 2 {
				require.NoError(t, db.AutoMigrate(tables...))
			}
			var preserved model.TopUp
			require.NoError(t, db.First(&preserved, orders[0].Id).Error)
			require.Equal(t, 300.01, preserved.Money)
			input := model.InvoiceApplication{Invoice: model.Invoice{CompanyName: "测试企业", TaxNumber: "91310000123456789X"}, OrderIDs: []int{orders[0].Id, orders[1].Id}}
			for _, ids := range [][]int{{}, {orders[0].Id}, {orders[0].Id, orders[0].Id}, {orders[2].Id}, {orders[3].Id}, {orders[4].Id}} {
				invalid := input
				invalid.OrderIDs = ids
				_, err := model.CreateInvoice(7, invalid)
				require.Error(t, err)
			}
			available, total, err := model.InvoiceEligibleOrders(7, 0, 100)
			require.NoError(t, err)
			require.EqualValues(t, 2, total)
			require.Len(t, available, 2)
			invoice, err := model.CreateInvoice(7, input)
			require.NoError(t, err)
			require.EqualValues(t, 50003, invoice.AmountCents)
			_, err = model.CreateInvoice(7, input)
			require.Error(t, err)
			var count int64
			require.NoError(t, db.Model(&model.Invoice{}).Count(&count).Error)
			require.EqualValues(t, 1, count)
			require.Error(t, model.TransitionInvoice(invoice.ID, 8, false, model.InvoiceWithdrawn, "", "", nil))
			require.Error(t, model.TransitionInvoice(invoice.ID, 1, true, model.InvoiceIssued, "", "invoice.pdf", []byte("%PDF-1.4")))
			require.Error(t, model.TransitionInvoice(invoice.ID, 1, true, model.InvoiceRejected, "", "", nil))
			require.NoError(t, model.TransitionInvoice(invoice.ID, 7, false, model.InvoiceWithdrawn, "", "", nil))
			invoice, err = model.CreateInvoice(7, input)
			require.NoError(t, err)
			require.NoError(t, model.TransitionInvoice(invoice.ID, 1, true, model.InvoiceRejected, "税号有误", "", nil))
			invoice, err = model.CreateInvoice(7, input)
			require.NoError(t, err)
			require.NoError(t, model.TransitionInvoice(invoice.ID, 1, true, model.InvoiceApproved, "已核对", "", nil))
			require.Error(t, model.TransitionInvoice(invoice.ID, 7, false, model.InvoiceWithdrawn, "", "", nil))
			gin.SetMode(gin.TestMode)
			engine := gin.New()
			engine.Use(func(c *gin.Context) {
				userID := 7
				if c.GetHeader("Test-User") == "8" {
					userID = 8
				}
				c.Set("id", userID)
			})
			engine.GET("/api/invoices/:id", InvoiceDetail)
			engine.GET("/api/invoices/:id/file", DownloadInvoice)
			engine.POST("/api/invoices/admin/:id/file", UploadInvoice)
			for _, suffix := range []string{"", "/file"} {
				request := httptest.NewRequest("GET", fmt.Sprintf("/api/invoices/%d%s", invoice.ID, suffix), nil)
				request.Header.Set("Test-User", "8")
				response := httptest.NewRecorder()
				engine.ServeHTTP(response, request)
				require.Equal(t, 404, response.Code)
			}
			for _, contents := range [][]byte{[]byte("<html>invalid</html>"), bytes.Repeat([]byte("x"), invoiceMaxFileBytes+1), []byte("%PDF-1.4\ninvoice")} {
				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)
				part, err := writer.CreateFormFile("file", "发票.pdf")
				require.NoError(t, err)
				_, err = part.Write(contents)
				require.NoError(t, err)
				require.NoError(t, writer.Close())
				request := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/invoices/admin/%d/file", invoice.ID), body)
				request.Header.Set("Content-Type", writer.FormDataContentType())
				response := httptest.NewRecorder()
				engine.ServeHTTP(response, request)
				if bytes.HasPrefix(contents, []byte("%PDF-")) {
					require.Equal(t, 200, response.Code)
				} else {
					require.Equal(t, 400, response.Code)
				}
			}
			response := httptest.NewRecorder()
			engine.ServeHTTP(response, httptest.NewRequest("GET", fmt.Sprintf("/api/invoices/%d/file", invoice.ID), nil))
			require.Equal(t, 200, response.Code)
			require.Equal(t, "%PDF-1.4\ninvoice", response.Body.String())
			require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
			require.Error(t, model.TransitionInvoice(invoice.ID, 1, true, model.InvoiceRejected, "reject", "", nil))
			for range 2 {
				require.NoError(t, db.AutoMigrate(tables...))
			}
			_, total, err = model.InvoiceEligibleOrders(7, 0, 100)
			require.NoError(t, err)
			require.Zero(t, total)
			config := model.InvoiceConfig{ID: 1, Enabled: false, MinimumCents: 1}
			require.NoError(t, db.Save(&config).Error)
			_, err = model.CreateInvoice(7, input)
			require.ErrorContains(t, err, "暂未开放")
		})
	}
}
