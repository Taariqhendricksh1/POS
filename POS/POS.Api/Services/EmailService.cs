using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
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
    private readonly SettingsService _settingsService;
    private readonly ILogger<EmailService> _logger;
    private static readonly HttpClient _httpClient = new();

    public EmailService(IOptions<EmailSettings> emailSettings, SettingsService settingsService, ILogger<EmailService> logger)
    {
        _emailSettings = emailSettings.Value;
        _settingsService = settingsService;
        _logger = logger;
    }

    public async Task SendInvoiceEmailAsync(Order order)
    {
        _logger.LogInformation("Sending invoice email for {InvoiceNumber} to {Email}", order.InvoiceNumber, order.ClientEmail);

        var settings = await _settingsService.GetAsync();
        var isPaidInvoice = order.PaymentMethod != PaymentMethod.EFT || order.EftPaymentReceived;
        var htmlBody = GenerateInvoiceHtml(order, settings, isPaidInvoice);
        var textBody = GenerateInvoicePlainText(order, settings, isPaidInvoice);
        var subject = isPaidInvoice
            ? $"Invoice {order.InvoiceNumber} - {settings.CompanyName}"
            : $"Invoice {order.InvoiceNumber} \u2014 Payment Required - {settings.CompanyName}";

        if (!string.IsNullOrEmpty(_emailSettings.ApiKey))
            await SendViaBrevoApiAsync(order, settings, subject, htmlBody, textBody);
        else
            await SendViaSmtpAsync(order, settings, subject, htmlBody, textBody);

        _logger.LogInformation("Invoice email sent successfully for {InvoiceNumber}", order.InvoiceNumber);
    }

    public async Task SendEftPaymentReceivedEmailAsync(Order order)
    {
        _logger.LogInformation("Sending EFT payment received email for {InvoiceNumber} to {Email}", order.InvoiceNumber, order.ClientEmail);

        var settings = await _settingsService.GetAsync();
        var htmlBody = GenerateInvoiceHtml(order, settings, isPaid: true);
        var textBody = GenerateInvoicePlainText(order, settings, isPaid: true);
        var subject = $"Payment Received \u2014 Invoice {order.InvoiceNumber} - {settings.CompanyName}";

        if (!string.IsNullOrEmpty(_emailSettings.ApiKey))
            await SendViaBrevoApiAsync(order, settings, subject, htmlBody, textBody);
        else
            await SendViaSmtpAsync(order, settings, subject, htmlBody, textBody);

        _logger.LogInformation("EFT payment received email sent for {InvoiceNumber}", order.InvoiceNumber);
    }

    public async Task SendPaymentReminderEmailAsync(Order order)
    {
        _logger.LogInformation("Sending payment reminder for {InvoiceNumber} to {Email}", order.InvoiceNumber, order.ClientEmail);

        var settings = await _settingsService.GetAsync();
        var currency = settings.CurrencySymbol;
        var bankDetailsHtml = GenerateBankDetailsHtml(settings);
        var bankDetailsText = GenerateBankDetailsText(settings);

        var htmlBody = $@"
            <!DOCTYPE html><html><head><meta charset='utf-8'/>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }}
                .card {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ background: #f59e0b; color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .header p {{ margin: 5px 0 0; opacity: 0.9; }}
                .body {{ padding: 30px; }}
                .amount {{ font-size: 32px; font-weight: 700; color: #1a1a2e; text-align: center; margin: 20px 0; }}
                .bank-details {{ background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; }}
                .bank-details h3 {{ margin: 0 0 10px; font-size: 14px; color: #0369a1; }}
                .bank-details table {{ width: 100%; font-size: 13px; }}
                .bank-details td {{ padding: 3px 0; }}
                .bank-details td:first-child {{ color: #666; width: 40%; }}
                .bank-details td:last-child {{ font-weight: 600; }}
                .footer {{ padding: 20px 30px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }}
            </style></head><body>
            <div class='card'>
                <div class='header'>
                    <h1>Payment Reminder</h1>
                    <p>{settings.CompanyName}</p>
                </div>
                <div class='body'>
                    <p>Hi {order.ClientName},</p>
                    <p>This is a friendly reminder that payment is still outstanding for the following invoice:</p>
                    <p><strong>Invoice:</strong> {order.InvoiceNumber}<br/>
                    <strong>Date:</strong> {order.CompletedAt?.ToString("dd MMM yyyy") ?? order.CreatedAt.ToString("dd MMM yyyy")}<br/>
                    <strong>Payment Method:</strong> EFT</p>
                    <div class='amount'>{currency}{order.Total:N2}</div>
                    {bankDetailsHtml}
                    <p>Please arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.</p>
                    <p>Thank you,<br/>{settings.CompanyName}</p>
                </div>
                <div class='footer'>
                    {(string.IsNullOrEmpty(settings.CompanyPhone) ? "" : $"<p>{settings.CompanyPhone} | {settings.CompanyEmail}</p>")}
                </div>
            </div></body></html>";

        var textBody = $"PAYMENT REMINDER\n\nInvoice: {order.InvoiceNumber}\nAmount Due: {currency}{order.Total:N2}\n{bankDetailsText}\nPlease arrange payment at your earliest convenience.\n\nThank you,\n{settings.CompanyName}";
        var subject = $"Payment Reminder \u2014 Invoice {order.InvoiceNumber} - {settings.CompanyName}";

        if (!string.IsNullOrEmpty(_emailSettings.ApiKey))
            await SendViaBrevoApiAsync(order, settings, subject, htmlBody, textBody);
        else
            await SendViaSmtpAsync(order, settings, subject, htmlBody, textBody);

        _logger.LogInformation("Payment reminder sent for {InvoiceNumber}", order.InvoiceNumber);
    }

    private async Task SendViaBrevoApiAsync(Order order, AppSettingsDocument settings, string subject, string htmlBody, string textBody)
    {
        _logger.LogInformation("Using Brevo HTTP API to send email");

        var payload = new
        {
            sender = new { name = settings.CompanyName, email = _emailSettings.SenderEmail },
            to = new[] { new { name = order.ClientName, email = order.ClientEmail } },
            subject,
            htmlContent = htmlBody,
            textContent = textBody
        };

        var json = JsonSerializer.Serialize(payload);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("api-key", _emailSettings.ApiKey);

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Brevo API error {StatusCode}: {Body}", response.StatusCode, responseBody);
            throw new Exception($"Brevo API error {response.StatusCode}: {responseBody}");
        }

        _logger.LogInformation("Brevo API response: {Body}", responseBody);
    }

    private async Task SendViaSmtpAsync(Order order, AppSettingsDocument settings, string subject, string htmlBody, string textBody)
    {
        _logger.LogInformation("Using SMTP to send email");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.CompanyName, _emailSettings.SenderEmail));
        message.To.Add(new MailboxAddress(order.ClientName, order.ClientEmail));
        message.Subject = subject;

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = htmlBody,
            TextBody = textBody
        };
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
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
    }

    private string GenerateInvoiceHtml(Order order, AppSettingsDocument settings, bool isPaid = true)
    {
        var currency = settings.CurrencySymbol;
        var sb = new StringBuilder();
        var statusBadge = isPaid ? "PAID" : "PAYMENT REQUIRED";
        var badgeColor = isPaid ? "#16c784" : "#f59e0b";

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
            .bank-details { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 30px; }
            .bank-details h3 { margin: 0 0 10px; font-size: 14px; color: #0369a1; }
            .bank-details table { width: 100%; font-size: 13px; }
            .bank-details td { padding: 3px 0; }
            .bank-details td:first-child { color: #666; width: 40%; }
            .bank-details td:last-child { font-weight: 600; }
            .footer { padding: 20px 30px; text-align: center; color: #888; font-size: 12px; }
        </style></head><body>");

        sb.AppendLine("<div class='invoice'>");
        sb.AppendLine($"<div class='header'><h1>{settings.CompanyName}</h1>");
        if (!string.IsNullOrEmpty(settings.CompanyAddress))
            sb.AppendLine($"<p>{settings.CompanyAddress}</p>");
        sb.AppendLine($"<span class='badge' style='background: {badgeColor};'>{statusBadge}</span></div>");

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
        if (order.ShippingCost > 0)
            sb.AppendLine($"<div class='total-row'><span>Shipping</span><span>{currency}{order.ShippingCost:N2}</span></div>");
        sb.AppendLine($"<div class='total-row grand'><span>Total</span><span>{currency}{order.Total:N2}</span></div>");
        sb.AppendLine("</div>");

        // Delivery info section
        if (order.DeliveryRequired && order.DeliveryAddress != null)
        {
            var addr = order.DeliveryAddress;
            var addressParts = new[] { addr.Street, addr.City, addr.Province, addr.PostalCode }
                .Where(p => !string.IsNullOrWhiteSpace(p));
            var fullAddress = string.Join(", ", addressParts);
            sb.AppendLine(@"<div style='padding: 16px 30px; background: #f0fdf4; border-top: 1px solid #bbf7d0;'>
                <div style='display: flex; align-items: center; gap: 8px; margin-bottom: 6px;'>
                    <span style='font-size: 16px;'>📦</span>
                    <strong style='font-size: 14px; color: #166534;'>Delivery Included</strong>
                </div>");
            if (!string.IsNullOrEmpty(fullAddress))
                sb.AppendLine($"<div style='font-size: 13px; color: #333; margin-left: 24px;'>{fullAddress}</div>");
            sb.AppendLine("</div>");
        }

        if (!isPaid)
        {
            sb.AppendLine("<div style='padding: 15px 30px; background: #fef3c7; color: #92400e; text-align: center; font-weight: 600; font-size: 14px;'>Payment is required via EFT. Please arrange payment at your earliest convenience.</div>");
            var bankHtml = GenerateBankDetailsHtml(settings);
            if (!string.IsNullOrEmpty(bankHtml))
                sb.AppendLine(bankHtml);
        }

        sb.AppendLine($"<div class='footer'><p>{(isPaid ? "Thank you for your purchase!" : "Thank you \u2014 we look forward to receiving your payment.")}</p>");
        if (!string.IsNullOrEmpty(settings.CompanyPhone))
            sb.AppendLine($"<p>{settings.CompanyPhone} | {settings.CompanyEmail}</p>");
        sb.AppendLine("</div></div></body></html>");

        return sb.ToString();
    }

    private string GenerateInvoicePlainText(Order order, AppSettingsDocument settings, bool isPaid = true)
    {
        var currency = settings.CurrencySymbol;
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
        if (order.ShippingCost > 0)
            sb.AppendLine($"Shipping: {currency}{order.ShippingCost:N2}");
        sb.AppendLine($"TOTAL: {currency}{order.Total:N2}");
        sb.AppendLine();
        if (order.DeliveryRequired && order.DeliveryAddress != null)
        {
            var addr = order.DeliveryAddress;
            var parts = new[] { addr.Street, addr.City, addr.Province, addr.PostalCode }
                .Where(p => !string.IsNullOrWhiteSpace(p));
            sb.AppendLine("DELIVERY INCLUDED");
            sb.AppendLine($"Address: {string.Join(", ", parts)}");
            sb.AppendLine();
        }
        sb.AppendLine($"STATUS: {(isPaid ? "PAID" : "PAYMENT REQUIRED")}");
        if (!isPaid)
        {
            sb.AppendLine("Please arrange EFT payment at your earliest convenience.");
            var bankText = GenerateBankDetailsText(settings);
            if (!string.IsNullOrEmpty(bankText))
                sb.AppendLine(bankText);
        }
        sb.AppendLine($"Thank you from {settings.CompanyName}!");

        return sb.ToString();
    }

    private string GenerateBankDetailsHtml(AppSettingsDocument settings)
    {
        if (string.IsNullOrEmpty(settings.BankName) && string.IsNullOrEmpty(settings.BankAccountNumber))
            return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine("<div class='bank-details'>");
        sb.AppendLine("<h3>Banking Details</h3>");
        sb.AppendLine("<table>");
        if (!string.IsNullOrEmpty(settings.BankName))
            sb.AppendLine($"<tr><td>Bank</td><td>{settings.BankName}</td></tr>");
        if (!string.IsNullOrEmpty(settings.BankAccountName))
            sb.AppendLine($"<tr><td>Account Name</td><td>{settings.BankAccountName}</td></tr>");
        if (!string.IsNullOrEmpty(settings.BankAccountNumber))
            sb.AppendLine($"<tr><td>Account Number</td><td>{settings.BankAccountNumber}</td></tr>");
        if (!string.IsNullOrEmpty(settings.BankBranchCode))
            sb.AppendLine($"<tr><td>Branch Code</td><td>{settings.BankBranchCode}</td></tr>");
        if (!string.IsNullOrEmpty(settings.BankAccountType))
            sb.AppendLine($"<tr><td>Account Type</td><td>{settings.BankAccountType}</td></tr>");
        if (!string.IsNullOrEmpty(settings.BankReference))
            sb.AppendLine($"<tr><td>Reference</td><td>{settings.BankReference}</td></tr>");
        sb.AppendLine("</table></div>");
        return sb.ToString();
    }

    private string GenerateBankDetailsText(AppSettingsDocument settings)
    {
        if (string.IsNullOrEmpty(settings.BankName) && string.IsNullOrEmpty(settings.BankAccountNumber))
            return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine("\nBANKING DETAILS:");
        if (!string.IsNullOrEmpty(settings.BankName))
            sb.AppendLine($"  Bank: {settings.BankName}");
        if (!string.IsNullOrEmpty(settings.BankAccountName))
            sb.AppendLine($"  Account Name: {settings.BankAccountName}");
        if (!string.IsNullOrEmpty(settings.BankAccountNumber))
            sb.AppendLine($"  Account Number: {settings.BankAccountNumber}");
        if (!string.IsNullOrEmpty(settings.BankBranchCode))
            sb.AppendLine($"  Branch Code: {settings.BankBranchCode}");
        if (!string.IsNullOrEmpty(settings.BankAccountType))
            sb.AppendLine($"  Account Type: {settings.BankAccountType}");
        if (!string.IsNullOrEmpty(settings.BankReference))
            sb.AppendLine($"  Reference: {settings.BankReference}");
        return sb.ToString();
    }

    public async Task SendResetEmailAsync(string toEmail, string toName, string subject, string htmlBody, string textBody)
    {
        _logger.LogInformation("Sending reset email to {Email}", toEmail);

        var settings = await _settingsService.GetAsync();

        if (!string.IsNullOrEmpty(_emailSettings.ApiKey))
        {
            var payload = new
            {
                sender = new { name = settings.CompanyName, email = _emailSettings.SenderEmail },
                to = new[] { new { name = toName, email = toEmail } },
                subject,
                htmlContent = htmlBody,
                textContent = textBody
            };

            var json = JsonSerializer.Serialize(payload);
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            request.Headers.Add("api-key", _emailSettings.ApiKey);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                throw new Exception($"Brevo API error {response.StatusCode}: {responseBody}");
            }
        }
        else
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(settings.CompanyName, _emailSettings.SenderEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;
            var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody, TextBody = textBody };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            var socketOptions = _emailSettings.SmtpPort == 465
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;
            await client.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.SmtpPort, socketOptions);
            if (!string.IsNullOrEmpty(_emailSettings.Password))
                await client.AuthenticateAsync(_emailSettings.SenderEmail, _emailSettings.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }

        _logger.LogInformation("Reset email sent to {Email}", toEmail);
    }
}
