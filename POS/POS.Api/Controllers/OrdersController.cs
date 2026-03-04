using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
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
        var order = await _orderService.AddItemToOrderAsync(id, request.Barcode);
        if (order == null)
            return BadRequest(new { message = "Could not add item. Check that the order is pending, product exists, and is in stock." });
        return Ok(order);
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

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<Order>> CompleteOrder(string id, [FromBody] CompleteOrderRequest request)
    {
        var order = await _orderService.CompleteOrderAsync(id, request.PaymentMethod);
        if (order == null)
            return BadRequest(new { message = "Could not complete order. Check stock availability and order status." });
        return Ok(order);
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<Order>> CancelOrder(string id)
    {
        var order = await _orderService.CancelOrderAsync(id);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteOrder(string id)
    {
        var deleted = await _orderService.DeleteOrderAsync(id);
        if (!deleted) return BadRequest(new { message = "Cannot delete order. It may be completed or not found." });
        return Ok(new { message = "Order deleted successfully" });
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
