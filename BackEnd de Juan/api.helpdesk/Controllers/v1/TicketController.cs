using System.Security.Claims;
using api.models.DTO;
using api.models.Entities;
using api.models.Responses;
using api.services.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.helpdesk.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class TicketController : ControllerBase
{
    private readonly ITicketRepository _ticketRepo;

    public TicketController(ITicketRepository ticketRepo)
    {
        _ticketRepo = ticketRepo;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role) ?? "user";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Ticket>>> GetAll()
    {
        try
        {
            var tickets = await _ticketRepo.GetAll(CurrentUserId, CurrentRole);
            return Ok(tickets);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error interno al obtener tickets: {ex.Message}"
            });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Ticket>> GetById(int id)
    {
        try
        {
            var ticket = await _ticketRepo.GetById(id, CurrentUserId, CurrentRole);
            if (ticket == null) return Forbid();
            return Ok(ticket);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error interno al obtener el ticket: {ex.Message}"
            });
        }
    }

    [HttpPost]
    public async Task<ActionResult<GeneralResponse>> Create([FromBody] TicketCreateDTO dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(new GeneralResponse
                {
                    Estado = false,
                    Codigo = 400,
                    Mensaje = "Datos inválidos. Revisa los campos requeridos."
                });

            var result = await _ticketRepo.Create(dto, CurrentUserId);
            return result.Estado ? Ok(result) : BadRequest(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error interno al crear el ticket: {ex.Message}"
            });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<GeneralResponse>> Update(int id, [FromBody] TicketUpdateDTO dto)
    {
        try
        {
            var result = await _ticketRepo.Update(id, dto, CurrentUserId, CurrentRole);
            if (result.Codigo == 403) return Forbid();
            if (result.Codigo == 404) return NotFound(result);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error interno al actualizar el ticket: {ex.Message}"
            });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<GeneralResponse>> Delete(int id)
    {
        try
        {
            var result = await _ticketRepo.Delete(id, CurrentUserId, CurrentRole);
            if (result.Codigo == 403) return Forbid();
            if (result.Codigo == 404) return NotFound(result);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error interno al eliminar el ticket: {ex.Message}"
            });
        }
    }
}
