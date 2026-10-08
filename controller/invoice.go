package controller

import (
	"errors"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const invoiceMaxFileBytes = 5 << 20

func invoiceError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"success": false, "message": message})
}

func invoicePage(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	return min(max(page, 1), 1000000), min(max(size, 1), 100)
}

func InvoiceSettings(c *gin.Context) {
	config, err := model.GetInvoiceConfig()
	if err != nil {
		invoiceError(c, 500, "无法读取开票设置")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": config})
}

func SaveInvoiceSettings(c *gin.Context) {
	var config model.InvoiceConfig
	if c.ShouldBindJSON(&config) != nil || config.MinimumCents < 1 || config.MinimumCents > 100000000000 || len([]rune(config.Notice)) > 2000 {
		invoiceError(c, 400, "开票设置无效，最低金额必须大于零")
		return
	}
	config.ID = 1
	if err := model.DB.Save(&config).Error; err != nil {
		invoiceError(c, 500, "保存开票设置失败")
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func InvoiceOrders(c *gin.Context) {
	page, size := invoicePage(c)
	orders, total, err := model.InvoiceEligibleOrders(c.GetInt("id"), (page-1)*size, size)
	if err != nil {
		invoiceError(c, 500, "读取订单失败")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"items": orders, "total": total}})
}

func SubmitInvoice(c *gin.Context) {
	var input model.InvoiceApplication
	if c.ShouldBindJSON(&input) != nil {
		invoiceError(c, 400, "开票申请格式无效")
		return
	}
	invoice, err := model.CreateInvoice(c.GetInt("id"), input)
	if err != nil {
		invoiceError(c, 400, err.Error())
		return
	}
	c.JSON(200, gin.H{"success": true, "data": invoice})
}

func ListInvoices(c *gin.Context) {
	page, size := invoicePage(c)
	query := model.DB.Model(&model.Invoice{})
	if !strings.HasPrefix(c.FullPath(), "/api/invoices/admin") {
		query = query.Where("user_id = ?", c.GetInt("id"))
	}
	if status := c.Query("status"); status != "" {
		switch status {
		case model.InvoicePending, model.InvoiceApproved, model.InvoiceIssued, model.InvoiceRejected, model.InvoiceWithdrawn:
			query = query.Where("status = ?", status)
		default:
			invoiceError(c, 400, "申请状态无效")
			return
		}
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		invoiceError(c, 500, "读取申请失败")
		return
	}
	items := []model.Invoice{}
	if err := query.Order("id DESC").Offset((page - 1) * size).Limit(size).Find(&items).Error; err != nil {
		invoiceError(c, 500, "读取申请失败")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"items": items, "total": total}})
}

func invoiceForRequest(c *gin.Context) (*model.Invoice, error) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		return nil, errors.New("invalid invoice id")
	}
	var invoice model.Invoice
	query := model.DB.Where("id = ?", id)
	if !strings.HasPrefix(c.FullPath(), "/api/invoices/admin") {
		query = query.Where("user_id = ?", c.GetInt("id"))
	}
	err = query.First(&invoice).Error
	return &invoice, err
}

func InvoiceDetail(c *gin.Context) {
	invoice, err := invoiceForRequest(c)
	if err != nil {
		invoiceError(c, 404, "申请不存在")
		return
	}
	orders := []model.InvoiceOrder{}
	if model.DB.Where("invoice_id = ?", invoice.ID).Find(&orders).Error != nil {
		invoiceError(c, 500, "读取申请订单失败")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"invoice": invoice, "orders": orders}})
}

func WithdrawInvoice(c *gin.Context) {
	invoice, err := invoiceForRequest(c)
	if err != nil {
		invoiceError(c, 404, "申请不存在")
		return
	}
	if err := model.TransitionInvoice(invoice.ID, c.GetInt("id"), false, model.InvoiceWithdrawn, "", "", nil); err != nil {
		invoiceError(c, 400, err.Error())
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func ReviewInvoice(c *gin.Context) {
	invoice, err := invoiceForRequest(c)
	if err != nil {
		invoiceError(c, 404, "申请不存在")
		return
	}
	var input struct {
		Status string `json:"status"`
		Note   string `json:"note"`
	}
	if c.ShouldBindJSON(&input) != nil || (input.Status != model.InvoiceApproved && input.Status != model.InvoiceRejected) {
		invoiceError(c, 400, "审核操作无效")
		return
	}
	if err := model.TransitionInvoice(invoice.ID, c.GetInt("id"), true, input.Status, input.Note, "", nil); err != nil {
		invoiceError(c, 400, err.Error())
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func UploadInvoice(c *gin.Context) {
	invoice, err := invoiceForRequest(c)
	if err != nil {
		invoiceError(c, 404, "申请不存在")
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, invoiceMaxFileBytes+(1<<20))
	if err := c.Request.ParseMultipartForm(invoiceMaxFileBytes); err != nil {
		invoiceError(c, 400, "文件过大或格式无效（最多 5 MB）")
		return
	}
	defer c.Request.MultipartForm.RemoveAll()
	header, err := c.FormFile("file")
	if err != nil || header.Size > invoiceMaxFileBytes {
		invoiceError(c, 400, "请上传 PDF 发票（最多 5 MB）")
		return
	}
	file, err := header.Open()
	if err != nil {
		invoiceError(c, 400, "无法读取文件")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, invoiceMaxFileBytes+1))
	if err != nil || len(data) > invoiceMaxFileBytes || len(data) < 5 || string(data[:5]) != "%PDF-" {
		invoiceError(c, 400, "仅支持 PDF 发票（最多 5 MB）")
		return
	}
	name := filepath.Base(strings.ReplaceAll(header.Filename, "\\", "/"))
	if len([]rune(name)) > 180 || strings.ToLower(filepath.Ext(name)) != ".pdf" {
		invoiceError(c, 400, "PDF 文件名无效或过长")
		return
	}
	if err := model.TransitionInvoice(invoice.ID, c.GetInt("id"), true, model.InvoiceIssued, c.PostForm("note"), name, data); err != nil {
		invoiceError(c, 400, err.Error())
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func DownloadInvoice(c *gin.Context) {
	invoice, err := invoiceForRequest(c)
	if err != nil || invoice.Status != model.InvoiceIssued {
		invoiceError(c, 404, "发票尚未开具或不存在")
		return
	}
	var file model.InvoiceFile
	if model.DB.First(&file, "invoice_id = ?", invoice.ID).Error != nil {
		invoiceError(c, 404, "发票附件不存在")
		return
	}
	c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": invoice.FileName}))
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "no-store")
	c.Data(200, "application/pdf", file.Data)
}
