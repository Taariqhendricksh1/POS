using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrdersController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var order = await _orderService.CreateOrderAsync(
            request.ClientEmail, request.ClientName, request.CustomerId, request.ClientPhone);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Order>> GetById(string id)
    {
        var order = await _orderService.GetByIdAsync(id);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpGet("invoice/{invoiceNumber}")]
    public async Task<ActionResult<Order>> GetByInvoiceNumber(string invoiceNumber)
    {
        var order = await _orderService.GetByInvoiceNumberAsync(invoiceNumber);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpGet("recent")]
    public async Task<ActionResult<List<Order>>> GetRecent([FromQuery] int limit = 50)
    {
        var orders = await _orderService.GetRecentOrdersAsync(limit);
        return Ok(orders);
    }

    [HttpPost("{id}/items")]
    public async Task<ActionResult<Order>> AddItem(string id, [FromBody] AddItemRequest request)
    {
        var result = await _orderService.AddItemToOrderAsync(id, request.Barcode);
        if (result.Success) return Ok(result.Order);

        return result.ErrorCode switch
        {
            "OUT_OF_STOCK" => Conflict(new
            {
                message = "Product is out of stock.",
                errorCode = "OUT_OF_STOCK",
                product = new
                {
                    id = result.Product!.Id,
                    name = result.Product.Name,
                    barcode = result.Product.Barcode,
                    sellingPrice = result.Product.SellingPrice,
                    quantityInStock = result.Product.QuantityInStock,
                    shop = result.Product.Shop
                }
            }),
            "NOT_FOUND" => NotFound(new { message = "Product not found.", errorCode = "NOT_FOUND" }),
            _ => BadRequest(new { message = "Could not add item. Check that the order is pending.", errorCode = "ORDER_INVALID" })
        };
    }

    [HttpPut("{id}/items/{productId}")]
    public async Task<ActionResult<Order>> UpdateItemQuantity(string id, string productId, [FromBody] UpdateQuantityRequest request)
    {
        var order = await _orderService.UpdateItemQuantityAsync(id, productId, request.Quantity);
        if (order == null) return BadRequest(new { message = "Could not update item quantity." });
        return Ok(order);
    }

    [HttpDelete("{id}/items/{productId}")]
    public async Task<ActionResult<Order>> RemoveItem(string id, string productId)
    {
        var order = await _orderService.RemoveItemFromOrderAsync(id, productId);
        if (order == null) return BadRequest(new { message = "Could not remove item." });
        return Ok(order);
    }

    [HttpPatch("{id}/items/{productId}/discount")]
    public async Task<ActionResult<Order>> UpdateItemDiscount(string id, string productId, [FromBody] UpdateItemDiscountRequest request)
    {
        var order = await _orderService.UpdateItemDiscountAsync(id, productId, request.DiscountPercentage);
        if (order == null)
            return BadRequest(new { message = "Could not update discount. Product may have a product-level discount." });
        return Ok(order);
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<Order>> CompleteOrder(string id, [FromBody] CompleteOrderRequest request)
    {
        var order = await _orderService.CompleteOrderAsync(id, request.PaymentMethod);
        if (order == null)
            return BadRequest(new { message = "Could not complete order. Check stock availability and order status." });
        return Ok(order);
    }

    [HttpPost("{id}/resend-email")]
    public async Task<ActionResult> ResendEmail(string id)
    {
        var result = await _orderService.ResendInvoiceEmailAsync(id);
        if (result == null) return NotFound();
        if (result == false) return BadRequest(new { message = "Failed to send email. Check server logs." });
        return Ok(new { message = "Invoice email sent successfully" });
    }

    [HttpPost("{id}/eft-payment-received")]
    public async Task<ActionResult<Order>> MarkEftPaymentReceived(string id)
    {
        var order = await _orderService.MarkEftPaymentReceivedAsync(id);
        if (order == null)
            return BadRequest(new { message = "Order not found, not completed, not EFT, or already marked as received." });
        return Ok(order);
    }

    [HttpPost("{id}/send-payment-reminder")]
    public async Task<ActionResult> SendPaymentReminder(string id)
    {
        var result = await _orderService.SendPaymentReminderAsync(id);
        if (result == null) return BadRequest(new { message = "Order not found, not EFT, or payment already received." });
        if (result == false) return BadRequest(new { message = "Failed to send reminder email. Check server logs." });
        return Ok(new { message = "Payment reminder sent successfully" });
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<Order>> CancelOrder(string id)
    {
        var order = await _orderService.CancelOrderAsync(id);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpGet("sales-summary")]
    public async Task<ActionResult<SalesSummary>> GetSalesSummary([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? shop = null)
    {
        var fromDate = from ?? DateTime.UtcNow.Date;
        var toDate = to ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
        var summary = await _orderService.GetSalesSummaryAsync(fromDate, toDate, shop);
        return Ok(summary);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteOrder(string id)
    {
        var deleted = await _orderService.DeleteOrderAsync(id);
        if (!deleted) return BadRequest(new { message = "Cannot delete order. It may be completed or not found." });
        return Ok(new { message = "Order deleted successfully" });
    }

    [HttpPatch("{id}/shipping")]
    public async Task<ActionResult<Order>> SetShippingCost(string id, [FromBody] SetShippingCostRequest request)
    {
        var order = await _orderService.SetShippingCostAsync(id, request.ShippingCost);
        if (order == null) return BadRequest(new { message = "Could not update shipping cost." });
        return Ok(order);
    }

    [HttpPatch("{id}/delivery")]
    public async Task<ActionResult<Order>> SetDeliveryInfo(string id, [FromBody] SetDeliveryInfoRequest request)
    {
        var address = request.DeliveryRequired ? new OrderDeliveryAddress
        {
            Street = request.Street ?? string.Empty,
            City = request.City ?? string.Empty,
            Province = request.Province ?? string.Empty,
            PostalCode = request.PostalCode ?? string.Empty,
        } : null;
        var order = await _orderService.SetDeliveryInfoAsync(id, request.DeliveryRequired, address);
        if (order == null) return BadRequest(new { message = "Could not update delivery info." });
        return Ok(order);
    }

    [HttpGet("customer/{customerId}")]
    public async Task<ActionResult<CustomerOrderSummary>> GetCustomerOrders(string customerId)
    {
        var summary = await _orderService.GetCustomerOrderSummaryAsync(customerId);
        return Ok(summary);
    }
}

public class CreateOrderRequest
{
    public string ClientEmail { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string? CustomerId { get; set; }
    public string? ClientPhone { get; set; }
}

public class AddItemRequest
{
    public string Barcode { get; set; } = string.Empty;
}

public class UpdateQuantityRequest
{
    public int Quantity { get; set; }
}

public class CompleteOrderRequest
{
    public PaymentMethod PaymentMethod { get; set; }
}

public class UpdateItemDiscountRequest
{
    public decimal DiscountPercentage { get; set; }
}

public class SetShippingCostRequest
{
    public decimal ShippingCost { get; set; }
}

public class SetDeliveryInfoRequest
{
    public bool DeliveryRequired { get; set; }
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
}
