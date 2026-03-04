using Microsoft.AspNetCore.Mvc;
using POS.Api.Models;
using POS.Api.Services;

namespace POS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly CustomerService _customerService;

    public CustomersController(CustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<ActionResult<List<Customer>>> GetAll()
    {
        var customers = await _customerService.GetAllAsync();
        return Ok(customers);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Customer>> GetById(string id)
    {
        var customer = await _customerService.GetByIdAsync(id);
        if (customer == null) return NotFound();
        return Ok(customer);
    }

    [HttpGet("email/{email}")]
    public async Task<ActionResult<Customer>> GetByEmail(string email)
    {
        var customer = await _customerService.GetByEmailAsync(email);
        if (customer == null) return NotFound();
        return Ok(customer);
    }

    [HttpGet("search/{query}")]
    public async Task<ActionResult<List<Customer>>> Search(string query)
    {
        var customers = await _customerService.SearchAsync(query);
        return Ok(customers);
    }

    [HttpPost]
    public async Task<ActionResult<Customer>> Create([FromBody] Customer customer)
    {
        // Check if email already exists
        if (!string.IsNullOrWhiteSpace(customer.Email))
        {
            var existing = await _customerService.GetByEmailAsync(customer.Email);
            if (existing != null)
                return Conflict(new { message = "A customer with this email already exists", customer = existing });
        }

        var created = await _customerService.CreateAsync(customer);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Customer>> Update(string id, [FromBody] Customer customer)
    {
        var existing = await _customerService.GetByIdAsync(id);
        if (existing == null) return NotFound();

        customer.Id = id;
        customer.CreatedAt = existing.CreatedAt;
        var updated = await _customerService.UpdateAsync(id, customer);
        if (!updated) return BadRequest();

        return Ok(customer);
    }

    [HttpPatch("{id}/deactivate")]
    public async Task<ActionResult> Deactivate(string id)
    {
        var result = await _customerService.DeactivateAsync(id);
        if (!result) return NotFound();
        return Ok(new { message = "Customer deactivated" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await _customerService.DeleteAsync(id);
        if (!deleted) return NotFound();
        return Ok(new { message = "Customer deleted" });
    }
}
