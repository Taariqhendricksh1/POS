using System.Text;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using POS.Api.Configuration;
using POS.Api.Models;

namespace POS.Api.Services;

public class EmailService
{
    private readonly EmailSettings _emailSettings;
    private readonly AppSettings _appSettings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<EmailSettings> emailSettings, IOptions<AppSettings> appSettings, ILogger<EmailService> logger)
    {
        _emailSettings = emailSettings.Value;
        _appSettings = appSettings.Value;
        _logger = logger;
    }

    public async Task SendInvoiceEmailAsync(Order order)
    {
        _logger.LogInformation("Sending invoice email for {InvoiceNumber} to {Email}", order.InvoiceNumber, order.ClientEmail);

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_appSettings.CompanyName, _emailSettings.SenderEmail));
        message.To.Add(new MailboxAddress(order.ClientName, order.ClientEmail));
        message.Subject = $"Invoice {order.InvoiceNumber} - {_appSettings.CompanyName}";

        var htmlBody = GenerateInvoiceHtml(order);

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = htmlBody,
            TextBody = GenerateInvoicePlainText(order)
        };

        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        // Port 587 = STARTTLS, Port 465 = implicit SSL
        var socketOptions = _emailSettings.SmtpPort == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;
        _logger.LogInformation("Connecting to SMTP {Server}:{Port} ({SocketOptions})", _emailSettings.SmtpServer, _emailSettings.SmtpPort, socketOptions);
        await client.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.SmtpPort, socketOptions);

        if (!string.IsNullOrEmpty(_emailSettings.Password))
        {
            _logger.LogInformation("Authenticating as {SenderEmail}", _emailSettings.SenderEmail);
            await client.AuthenticateAsync(_emailSettings.SenderEmail, _emailSettings.Password);
        }

        await client.SendAsync(message);
        await client.DisconnectAsync(true);
        _logger.LogInformation("Invoice email sent successfully for {InvoiceNumber}", order.InvoiceNumber);
    }

    private string GenerateInvoiceHtml(Order order)
    {
        var currency = _appSettings.CurrencySymbol;
        var sb = new StringBuilder();

        sb.AppendLine(@"<!DOCTYPE html><html><head><meta charset='utf-8'/>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .invoice { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0; opacity: 0.8; }
            .badge { display: inline-block; background: #16c784; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }
            .details { padding: 20px 30px; border-bottom: 1px solid #eee; }
            .details-grid { display: flex; justify-content: space-between; flex-wrap: wrap; }
            .detail-item { margin-bottom: 10px; }
            .detail-item label { font-size: 11px; color: #888; text-transform: uppercase; display: block; }
            .detail-item span { font-size: 14px; font-weight: 600; }
            .items { padding: 0 30px; }
            .items table { width: 100%; border-collapse: collapse; }
            .items th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #eee; font-size: 11px; text-transform: uppercase; color: #888; }
            .items td { padding: 12px 8px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
            .items .amount { text-align: right; }
            .totals { padding: 20px 30px; background: #fafafa; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .total-row.grand { font-size: 20px; font-weight: 700; color: #1a1a2e; border-top: 2px solid #1a1a2e; padding-top: 12px; margin-top: 8px; }
            .footer { padding: 20px 30px; text-align: center; color: #888; font-size: 12px; }
        </style></head><body>");

        sb.AppendLine("<div class='invoice'>");
        sb.AppendLine($"<div class='header'><h1>{_appSettings.CompanyName}</h1>");
        if (!string.IsNullOrEmpty(_appSettings.CompanyAddress))
            sb.AppendLine($"<p>{_appSettings.CompanyAddress}</p>");
        sb.AppendLine($"<span class='badge'>PAID</span></div>");

        sb.AppendLine("<div class='details'><div class='details-grid'>");
        sb.AppendLine($"<div class='detail-item'><label>Invoice</label><span>{order.InvoiceNumber}</span></div>");
        sb.AppendLine($"<div class='detail-item'><label>Date</label><span>{order.CompletedAt?.ToString("dd MMM yyyy") ?? order.CreatedAt.ToString("dd MMM yyyy")}</span></div>");
        sb.AppendLine($"<div class='detail-item'><label>Client</label><span>{order.ClientName}</span></div>");
        sb.AppendLine($"<div class='detail-item'><label>Payment</label><span>{order.PaymentMethod}</span></div>");
        sb.AppendLine("</div></div>");

        sb.AppendLine("<div class='items'><table>");
        sb.AppendLine("<tr><th>Item</th><th>Qty</th><th class='amount'>Price</th><th class='amount'>Total</th></tr>");

        foreach (var item in order.Items)
        {
            var priceDisplay = item.DiscountPercentage > 0
                ? $"<s>{currency}{item.UnitPrice:N2}</s> {currency}{item.EffectivePrice:N2}"
                : $"{currency}{item.EffectivePrice:N2}";

            sb.AppendLine($"<tr><td>{item.ProductName}</td><td>{item.Quantity}</td><td class='amount'>{priceDisplay}</td><td class='amount'>{currency}{item.LineTotal:N2}</td></tr>");
        }

        sb.AppendLine("</table></div>");

        sb.AppendLine("<div class='totals'>");
        sb.AppendLine($"<div class='total-row'><span>Subtotal</span><span>{currency}{order.Subtotal:N2}</span></div>");
        if (order.DiscountTotal > 0)
            sb.AppendLine($"<div class='total-row'><span>Discount</span><span>-{currency}{order.DiscountTotal:N2}</span></div>");
        sb.AppendLine($"<div class='total-row'><span>VAT ({order.TaxRate}% incl.)</span><span>{currency}{order.TaxAmount:N2}</span></div>");
        sb.AppendLine($"<div class='total-row grand'><span>Total</span><span>{currency}{order.Total:N2}</span></div>");
        sb.AppendLine("</div>");

        sb.AppendLine($"<div class='footer'><p>Thank you for your purchase!</p>");
        if (!string.IsNullOrEmpty(_appSettings.CompanyPhone))
            sb.AppendLine($"<p>{_appSettings.CompanyPhone} | {_appSettings.CompanyEmail}</p>");
        sb.AppendLine("</div></div></body></html>");

        return sb.ToString();
    }

    private string GenerateInvoicePlainText(Order order)
    {
        var currency = _appSettings.CurrencySymbol;
        var sb = new StringBuilder();
        sb.AppendLine($"INVOICE: {order.InvoiceNumber}");
        sb.AppendLine($"Date: {order.CompletedAt?.ToString("dd MMM yyyy") ?? order.CreatedAt.ToString("dd MMM yyyy")}");
        sb.AppendLine($"Client: {order.ClientName} ({order.ClientEmail})");
        sb.AppendLine($"Payment Method: {order.PaymentMethod}");
        sb.AppendLine(new string('-', 50));

        foreach (var item in order.Items)
        {
            sb.AppendLine($"{item.ProductName} x{item.Quantity} @ {currency}{item.EffectivePrice:N2} = {currency}{item.LineTotal:N2}");
        }

        sb.AppendLine(new string('-', 50));
        sb.AppendLine($"Subtotal: {currency}{order.Subtotal:N2}");
        if (order.DiscountTotal > 0)
            sb.AppendLine($"Discount: -{currency}{order.DiscountTotal:N2}");
        sb.AppendLine($"VAT ({order.TaxRate}%): {currency}{order.TaxAmount:N2}");
        sb.AppendLine($"TOTAL: {currency}{order.Total:N2}");
        sb.AppendLine();
        sb.AppendLine($"STATUS: PAID");
        sb.AppendLine($"Thank you for your purchase from {_appSettings.CompanyName}!");

        return sb.ToString();
    }
}
