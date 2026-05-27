using System.ComponentModel.DataAnnotations;

namespace api.models.DTO;

public class TicketUpdateDTO
{
    [MaxLength(200)]
    public string? Title { get; set; }

    [MaxLength(4000)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; }

    [MaxLength(50)]
    public string? Priority { get; set; }

    public int? AssignedToId { get; set; }
}
