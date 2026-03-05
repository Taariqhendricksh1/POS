using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ProductService _productService;

    public ProductsController(ProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<List<Product>>> GetAll([FromQuery] string? shop = null)
    {
        var products = await _productService.GetAllAsync(shop);
        return Ok(products);
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<Product>>> GetActive([FromQuery] string? shop = null)
    {
        var products = await _productService.GetActiveAsync(shop);
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(string id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null) return NotFound();
        return Ok(product);
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<ActionResult<Product>> GetByBarcode(string barcode)
    {
        var product = await _productService.GetByBarcodeOrSkuAsync(barcode);
        if (product == null) return NotFound(new { message = "Product not found for this barcode/SKU" });
        return Ok(product);
    }

    [HttpGet("search/{query}")]
    public async Task<ActionResult<List<Product>>> Search(string query, [FromQuery] string? shop = null)
    {
        var products = await _productService.SearchAsync(query, shop);
        return Ok(products);
    }

    [HttpGet("low-stock")]
    public async Task<ActionResult<List<Product>>> GetLowStock([FromQuery] string? shop = null)
    {
        var products = await _productService.GetLowStockAsync(shop);
        return Ok(products);
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStats>> GetDashboardStats([FromQuery] string? shop = null)
    {
        var stats = await _productService.GetDashboardStatsAsync(shop);
        return Ok(stats);
    }

    [HttpGet("shops")]
    public async Task<ActionResult<List<string>>> GetShops()
    {
        var shops = await _productService.GetDistinctShopsAsync();
        return Ok(shops);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] Product product)
    {
        // Require at least barcode or SKU
        var hasBarcode = !string.IsNullOrWhiteSpace(product.Barcode);
        var hasSku = !string.IsNullOrWhiteSpace(product.Sku);
        if (!hasBarcode && !hasSku)
            return BadRequest(new { message = "Either barcode or SKU is required." });

        // Check barcode uniqueness if provided
        if (hasBarcode)
        {
            var existingByBarcode = await _productService.GetByBarcodeAsync(product.Barcode);
            if (existingByBarcode != null)
                return Conflict(new { message = "A product with this barcode already exists", product = existingByBarcode });
        }

        // Check SKU uniqueness if provided
        if (hasSku)
        {
            var existingBySku = await _productService.GetBySkuAsync(product.Sku);
            if (existingBySku != null)
                return Conflict(new { message = "A product with this SKU already exists" });
        }

        var created = await _productService.CreateAsync(product);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Product>> Update(string id, [FromBody] Product product)
    {
        var existing = await _productService.GetByIdAsync(id);
        if (existing == null) return NotFound();

        product.Id = id;
        product.CreatedAt = existing.CreatedAt;
        var updated = await _productService.UpdateAsync(id, product);
        if (!updated) return BadRequest();

        return Ok(product);
    }

    [HttpPatch("{id}/stock")]
    public async Task<ActionResult> UpdateStock(string id, [FromBody] StockUpdateRequest request)
    {
        var updated = await _productService.UpdateStockAsync(id, request.QuantityChange);
        if (!updated) return NotFound();
        return Ok(new { message = "Stock updated successfully" });
    }

    [HttpPatch("{id}/deactivate")]
    public async Task<ActionResult> Deactivate(string id)
    {
        var result = await _productService.DeactivateAsync(id);
        if (!result) return NotFound();
        return Ok(new { message = "Product deactivated successfully" });
    }

    [HttpPatch("{id}/activate")]
    public async Task<ActionResult> Activate(string id)
    {
        var result = await _productService.ActivateAsync(id);
        if (!result) return NotFound();
        return Ok(new { message = "Product activated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await _productService.HardDeleteAsync(id);
        if (!deleted) return NotFound();
        return Ok(new { message = "Product permanently deleted" });
    }
}

public class StockUpdateRequest
{
    public int QuantityChange { get; set; }
}
