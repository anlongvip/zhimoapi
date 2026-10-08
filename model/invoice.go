package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	InvoicePending   = "pending"
	InvoiceApproved  = "approved"
	InvoiceIssued    = "issued"
	InvoiceRejected  = "rejected"
	InvoiceWithdrawn = "withdrawn"
)

type InvoiceConfig struct {
	ID           int    `json:"id"`
	Enabled      bool   `json:"enabled"`
	MinimumCents int64  `json:"minimum_cents"`
	Notice       string `json:"notice" gorm:"type:text"`
}

type Invoice struct {
	ID             int    `json:"id"`
	UserID         int    `json:"user_id" gorm:"index"`
	CompanyName    string `json:"company_name" gorm:"type:varchar(200)"`
	TaxNumber      string `json:"tax_number" gorm:"type:varchar(32)"`
	BankName       string `json:"bank_name" gorm:"type:varchar(200)"`
	BankAccount    string `json:"bank_account" gorm:"type:varchar(100)"`
	CompanyAddress string `json:"company_address" gorm:"type:varchar(300)"`
	CompanyPhone   string `json:"company_phone" gorm:"type:varchar(50)"`
	Remark         string `json:"remark" gorm:"type:text"`
	AmountCents    int64  `json:"amount_cents"`
	Status         string `json:"status" gorm:"type:varchar(20);index"`
	ReviewNote     string `json:"review_note" gorm:"type:text"`
	ReviewedBy     int    `json:"reviewed_by"`
	CreatedAt      int64  `json:"created_at"`
	UpdatedAt      int64  `json:"updated_at"`
	FileName       string `json:"file_name" gorm:"type:varchar(200)"`
}

// Claims prevent simultaneous applications for the same order, including across
// server instances. Rejected/withdrawn claims are released in the same transaction.
type InvoiceOrderClaim struct {
	TopUpID   int `gorm:"primaryKey;autoIncrement:false"`
	InvoiceID int `gorm:"index"`
}

// Historical order snapshots remain after claims are released.
type InvoiceOrder struct {
	ID          int    `json:"id"`
	InvoiceID   int    `json:"-" gorm:"index"`
	TopUpID     int    `json:"top_up_id"`
	TradeNo     string `json:"trade_no" gorm:"type:varchar(255)"`
	AmountCents int64  `json:"amount_cents"`
}

// Kept separate so list/detail queries never load the attachment. GORM maps
// bytes to the native binary column on each supported database.
type InvoiceFile struct {
	InvoiceID int    `gorm:"primaryKey;autoIncrement:false"`
	Data      []byte `json:"-"`
}

type InvoiceApplication struct {
	Invoice
	OrderIDs []int `json:"order_ids"`
}

func GetInvoiceConfig() (InvoiceConfig, error) {
	config := InvoiceConfig{ID: 1, Enabled: true, MinimumCents: 50000, Notice: "人工审核后开具电子发票，请仔细核对开票信息。申请不额外扣除账户余额。"}
	err := DB.First(&config, 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return config, nil
	}
	return config, err
}

func InvoiceEligibleOrders(userID, offset, limit int) ([]TopUp, int64, error) {
	// Existing topups do not retain currency. Only the CNY Epay provider can
	// safely be used for domestic invoicing; never sum Stripe/Creem/Waffo money.
	query := DB.Model(&TopUp{}).Where("user_id = ? AND status = ? AND money > 0 AND (payment_provider = ? OR (payment_provider = '' AND payment_method IN ?))", userID, common.TopUpStatusSuccess, PaymentProviderEpay, []string{"alipay", "wxpay", "qqpay"}).Where("id NOT IN (?)", DB.Model(&InvoiceOrderClaim{}).Select("top_up_id"))
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}
	orders := []TopUp{}
	err := query.Order("id DESC").Offset(offset).Limit(limit).Find(&orders).Error
	return orders, count, err
}

func CreateInvoice(userID int, input InvoiceApplication) (*Invoice, error) {
	config, err := GetInvoiceConfig()
	if err != nil {
		return nil, err
	}
	if !config.Enabled {
		return nil, errors.New("开票申请暂未开放")
	}
	if len(input.OrderIDs) == 0 || len(input.OrderIDs) > 100 {
		return nil, errors.New("请选择 1 至 100 笔订单")
	}
	invoice := Invoice{UserID: userID, CompanyName: strings.TrimSpace(input.CompanyName), TaxNumber: strings.ToUpper(strings.TrimSpace(input.TaxNumber)), BankName: strings.TrimSpace(input.BankName), BankAccount: strings.TrimSpace(input.BankAccount), CompanyAddress: strings.TrimSpace(input.CompanyAddress), CompanyPhone: strings.TrimSpace(input.CompanyPhone), Remark: strings.TrimSpace(input.Remark), Status: InvoicePending, CreatedAt: time.Now().Unix(), UpdatedAt: time.Now().Unix()}
	if invoice.CompanyName == "" || len([]rune(invoice.CompanyName)) > 200 {
		return nil, errors.New("请填写有效的公司名称（最多 200 字）")
	}
	if len(invoice.TaxNumber) < 15 || len(invoice.TaxNumber) > 20 {
		return nil, errors.New("税号应为 15 至 20 位字母或数字")
	}
	for _, ch := range invoice.TaxNumber {
		if !(ch >= '0' && ch <= '9' || ch >= 'A' && ch <= 'Z') {
			return nil, errors.New("税号只能包含字母和数字")
		}
	}
	if len([]rune(invoice.BankName)) > 200 || len([]rune(invoice.BankAccount)) > 100 || len([]rune(invoice.CompanyAddress)) > 300 || len([]rune(invoice.CompanyPhone)) > 50 || len([]rune(invoice.Remark)) > 1000 {
		return nil, errors.New("开票信息超出长度限制")
	}
	err = DB.Transaction(func(tx *gorm.DB) error {
		ids := map[int]bool{}
		for _, id := range input.OrderIDs {
			if id <= 0 || ids[id] {
				return errors.New("订单选择无效或重复")
			}
			ids[id] = true
		}
		orders := []TopUp{}
		if err := lockForUpdate(tx).Where("id IN ? AND user_id = ? AND status = ? AND money > 0 AND (payment_provider = ? OR (payment_provider = '' AND payment_method IN ?))", input.OrderIDs, userID, common.TopUpStatusSuccess, PaymentProviderEpay, []string{"alipay", "wxpay", "qqpay"}).Order("id ASC").Find(&orders).Error; err != nil {
			return err
		}
		if len(orders) != len(ids) {
			return errors.New("订单不存在、未支付或不支持人民币开票")
		}
		snapshots := make([]InvoiceOrder, 0, len(orders))
		for _, order := range orders {
			amount := decimal.NewFromFloat(order.Money).Mul(decimal.NewFromInt(100)).Round(0)
			if amount.LessThanOrEqual(decimal.Zero) || amount.GreaterThan(decimal.NewFromInt(100000000000)) {
				return errors.New("订单金额无效")
			}
			cents := amount.IntPart()
			invoice.AmountCents += cents
			snapshots = append(snapshots, InvoiceOrder{TopUpID: order.Id, TradeNo: order.TradeNo, AmountCents: cents})
		}
		if invoice.AmountCents < config.MinimumCents {
			return fmt.Errorf("最低开票金额为 ¥%.2f", float64(config.MinimumCents)/100)
		}
		if err := tx.Create(&invoice).Error; err != nil {
			return err
		}
		for i := range snapshots {
			snapshots[i].InvoiceID = invoice.ID
			if err := tx.Create(&InvoiceOrderClaim{TopUpID: snapshots[i].TopUpID, InvoiceID: invoice.ID}).Error; err != nil {
				return errors.New("订单已被其他开票申请占用，请刷新后重试")
			}
		}
		return tx.Create(&snapshots).Error
	})
	return &invoice, err
}

func TransitionInvoice(id, actorID int, admin bool, target, note, fileName string, data []byte) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var invoice Invoice
		query := lockForUpdate(tx).Where("id = ?", id)
		if !admin {
			query = query.Where("user_id = ?", actorID)
		}
		if err := query.First(&invoice).Error; err != nil {
			return err
		}
		allowed := !admin && target == InvoiceWithdrawn && invoice.Status == InvoicePending
		if admin {
			allowed = target == InvoiceApproved && invoice.Status == InvoicePending || target == InvoiceRejected && (invoice.Status == InvoicePending || invoice.Status == InvoiceApproved) || target == InvoiceIssued && invoice.Status == InvoiceApproved
		}
		if !allowed {
			return errors.New("申请状态已变化或不允许此操作，请刷新")
		}
		if len([]rune(note)) > 1000 || (target == InvoiceRejected && strings.TrimSpace(note) == "") {
			return errors.New("驳回需要填写原因（最多 1000 字）")
		}
		updates := map[string]any{"status": target, "updated_at": time.Now().Unix()}
		if admin {
			updates["reviewed_by"] = actorID
			updates["review_note"] = strings.TrimSpace(note)
		}
		if target == InvoiceIssued {
			if len(data) == 0 || fileName == "" {
				return errors.New("请上传发票文件")
			}
			if err := tx.Create(&InvoiceFile{InvoiceID: id, Data: data}).Error; err != nil {
				return err
			}
			updates["file_name"] = fileName
		}
		result := tx.Model(&Invoice{}).Where("id = ? AND status = ?", id, invoice.Status).Updates(updates)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return errors.New("申请已被处理，请刷新")
		}
		if target == InvoiceRejected || target == InvoiceWithdrawn {
			return tx.Where("invoice_id = ?", id).Delete(&InvoiceOrderClaim{}).Error
		}
		return nil
	})
}
