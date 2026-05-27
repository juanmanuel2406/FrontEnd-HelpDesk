using System.ComponentModel.DataAnnotations;

namespace api.models.DTO;

public class TicketCreateDTO
{
    [Required(ErrorMessage = "Title is required")]
    [MaxLength(200)]
    public string Title { get; set; }

    [Required(ErrorMessage = "Description is required")]
    [MaxLength(4000)]
    public string Description { get; set; }

    public string? Priority { get; set; }
}
