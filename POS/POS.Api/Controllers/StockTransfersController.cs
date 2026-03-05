using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/stock-transfers")]
public class StockTransfersController : ControllerBase
{
    private readonly StockTransferService _transferService;

    public StockTransfersController(StockTransferService transferService)
    {
        _transferService = transferService;
    }

    [HttpPost]
    public async Task<ActionResult<StockTransfer>> Create([FromBody] CreateTransferRequest request)
    {
        var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "unknown";
        var transfer = await _transferService.CreateTransferAsync(
            request.RecipientCompany, request.RecipientContact,
            request.RecipientPhone, request.RecipientEmail,
            request.Notes, userEmail);
        return CreatedAtAction(nameof(GetById), new { id = transfer.Id }, transfer);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StockTransfer>> GetById(string id)
    {
        var transfer = await _transferService.GetByIdAsync(id);
        if (transfer == null) return NotFound();
        return Ok(transfer);
    }

    [HttpGet("recent")]
    public async Task<ActionResult<List<StockTransfer>>> GetRecent([FromQuery] int limit = 50)
    {
        var transfers = await _transferService.GetRecentAsync(limit);
        return Ok(transfers);
    }

    [HttpPost("{id}/items")]
    public async Task<ActionResult<StockTransfer>> AddItem(string id, [FromBody] AddTransferItemRequest request)
    {
        var transfer = await _transferService.AddItemAsync(id, request.Barcode);
        if (transfer == null) return BadRequest(new { message = "Could not add item. Product not found or transfer is not in draft." });
        return Ok(transfer);
    }

    [HttpPut("{id}/items/{productId}")]
    public async Task<ActionResult<StockTransfer>> UpdateItemQuantity(string id, string productId, [FromBody] UpdateTransferQuantityRequest request)
    {
        var transfer = await _transferService.UpdateItemQuantityAsync(id, productId, request.Quantity);
        if (transfer == null) return BadRequest(new { message = "Could not update item quantity." });
        return Ok(transfer);
    }

    [HttpDelete("{id}/items/{productId}")]
    public async Task<ActionResult<StockTransfer>> RemoveItem(string id, string productId)
    {
        var transfer = await _transferService.RemoveItemAsync(id, productId);
        if (transfer == null) return BadRequest(new { message = "Could not remove item." });
        return Ok(transfer);
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<StockTransfer>> Complete(string id)
    {
        var transfer = await _transferService.CompleteTransferAsync(id);
        if (transfer == null)
            return BadRequest(new { message = "Could not complete transfer. Check stock availability and transfer status." });
        return Ok(transfer);
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<StockTransfer>> Cancel(string id)
    {
        var transfer = await _transferService.CancelTransferAsync(id);
        if (transfer == null) return NotFound();
        return Ok(transfer);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await _transferService.DeleteTransferAsync(id);
        if (!deleted) return BadRequest(new { message = "Cannot delete transfer. It may be completed or not found." });
        return Ok(new { message = "Transfer deleted successfully" });
    }

    [HttpGet("summary")]
    public async Task<ActionResult<TransferSummary>> GetSummary([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.Date;
        var toDate = to ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
        var summary = await _transferService.GetTransferSummaryAsync(fromDate, toDate);
        return Ok(summary);
    }
}

public class CreateTransferRequest
{
    public string RecipientCompany { get; set; } = string.Empty;
    public string? RecipientContact { get; set; }
    public string? RecipientPhone { get; set; }
    public string? RecipientEmail { get; set; }
    public string? Notes { get; set; }
}

public class AddTransferItemRequest
{
    public string Barcode { get; set; } = string.Empty;
}

public class UpdateTransferQuantityRequest
{
    public int Quantity { get; set; }
}
