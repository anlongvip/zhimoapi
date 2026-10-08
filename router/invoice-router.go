package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

func registerInvoiceRoutes(api *gin.RouterGroup) {
	user := api.Group("/invoices")
	user.Use(middleware.UserAuth(), middleware.DisableCache(), middleware.SessionCookieOriginGuard())
	user.GET("/settings", controller.InvoiceSettings)
	user.GET("/orders", controller.InvoiceOrders)
	user.GET("", controller.ListInvoices)
	user.POST("", middleware.CriticalRateLimit(), controller.SubmitInvoice)
	user.GET("/:id", controller.InvoiceDetail)
	user.POST("/:id/withdraw", controller.WithdrawInvoice)
	user.GET("/:id/file", controller.DownloadInvoice)
	admin := api.Group("/invoices/admin")
	admin.Use(middleware.AdminAuth(), middleware.DisableCache(), middleware.SessionCookieOriginGuard())
	admin.GET("", controller.ListInvoices)
	admin.PUT("/settings", controller.SaveInvoiceSettings)
	admin.GET("/:id", controller.InvoiceDetail)
	admin.POST("/:id/review", controller.ReviewInvoice)
	admin.POST("/:id/file", middleware.CriticalRateLimit(), controller.UploadInvoice)
	admin.GET("/:id/file", controller.DownloadInvoice)
}
