using api.models.DTO;
using api.models.Entities;
using api.models.Responses;

namespace api.services.Repositories;

public interface ITicketRepository
{
    Task<IEnumerable<Ticket>> GetAll(int currentUserId, string role);
    Task<Ticket?> GetById(int id, int currentUserId, string role);
    Task<GeneralResponse> Create(TicketCreateDTO dto, int createdById);
    Task<GeneralResponse> Update(int id, TicketUpdateDTO dto, int currentUserId, string role);
    Task<GeneralResponse> Delete(int id, int currentUserId, string role);
}
