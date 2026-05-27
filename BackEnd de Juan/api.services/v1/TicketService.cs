using api.models.DTO;
using api.models.Entities;
using api.models.Responses;
using api.services.Data;
using api.services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace api.services.v1;

public class TicketService : ITicketRepository
{
    private readonly AppDbContext _db;

    public TicketService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<Ticket>> GetAll(int currentUserId, string role)
    {
        var query = role == "admin"
            ? _db.Tickets.AsNoTracking().Where(t => !t.IsDeleted)
            : _db.Tickets.AsNoTracking().Where(t => !t.IsDeleted && t.CreatedById == currentUserId);

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
    }

    public async Task<Ticket?> GetById(int id, int currentUserId, string role)
    {
        var ticket = await _db.Tickets
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (ticket == null) return null;
        if (role != "admin" && ticket.CreatedById != currentUserId) return null;
        return ticket;
    }

    public async Task<GeneralResponse> Create(TicketCreateDTO dto, int createdById)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return new GeneralResponse { Estado = false, Codigo = 400, Mensaje = "El título es obligatorio" };
        if (string.IsNullOrWhiteSpace(dto.Description))
            return new GeneralResponse { Estado = false, Codigo = 400, Mensaje = "La descripción es obligatoria" };

        var ticket = new Ticket
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Priority = dto.Priority?.Trim().ToLowerInvariant() ?? "medium",
            Status = "open",
            CreatedById = createdById,
            CreatedAt = DateTime.UtcNow
        };

        _db.Tickets.Add(ticket);

        try
        {
            await _db.SaveChangesAsync();
            return new GeneralResponse { Estado = true, Codigo = 1, Mensaje = "Ticket creado exitosamente" };
        }
        catch (DbUpdateException ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error de base de datos: {inner}"
            };
        }
    }

    public async Task<GeneralResponse> Update(int id, TicketUpdateDTO dto, int currentUserId, string role)
    {
        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null || ticket.IsDeleted)
            return new GeneralResponse { Estado = false, Codigo = 404, Mensaje = "Ticket no encontrado" };
        if (role != "admin" && ticket.CreatedById != currentUserId)
            return new GeneralResponse { Estado = false, Codigo = 403, Mensaje = "No tienes permiso para modificar este ticket" };

        if (dto.Title != null) ticket.Title = dto.Title.Trim();
        if (dto.Description != null) ticket.Description = dto.Description.Trim();
        if (dto.Status != null) ticket.Status = dto.Status.Trim().ToLowerInvariant();
        if (dto.Priority != null) ticket.Priority = dto.Priority.Trim().ToLowerInvariant();
        if (dto.AssignedToId.HasValue) ticket.AssignedToId = dto.AssignedToId;
        ticket.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
            return new GeneralResponse { Estado = true, Codigo = 1, Mensaje = "Ticket actualizado exitosamente" };
        }
        catch (DbUpdateException ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error de base de datos: {inner}"
            };
        }
    }

    public async Task<GeneralResponse> Delete(int id, int currentUserId, string role)
    {
        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null || ticket.IsDeleted)
            return new GeneralResponse { Estado = false, Codigo = 404, Mensaje = "Ticket no encontrado" };
        if (role != "admin" && ticket.CreatedById != currentUserId)
            return new GeneralResponse { Estado = false, Codigo = 403, Mensaje = "No tienes permiso para eliminar este ticket" };

        ticket.IsDeleted = true;
        ticket.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
            return new GeneralResponse { Estado = true, Codigo = 1, Mensaje = "Ticket eliminado exitosamente" };
        }
        catch (DbUpdateException ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return new GeneralResponse
            {
                Estado = false,
                Codigo = 500,
                Mensaje = $"Error de base de datos: {inner}"
            };
        }
    }
}
