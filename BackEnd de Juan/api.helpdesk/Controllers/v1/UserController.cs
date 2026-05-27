using api.models.DTO;
using api.models.Responses;
using api.services.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace api.helpdesk.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public UserController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] UserLoginDTO user)
    {
        var result = await _userRepository.Login(user);
        return Ok(result);
    }

    [HttpPost("register")]
    public async Task<ActionResult<GeneralResponse>> Register([FromBody] UserRegisterDTO user)
    {
        var baseUrl = $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";
        var result = await _userRepository.Register(user, baseUrl);
        return Ok(result);
    }

    [HttpGet("confirm-email")]
    public async Task<ActionResult<GeneralResponse>> ConfirmEmail([FromQuery] int userId, [FromQuery] string token)
    {
        var result = await _userRepository.ConfirmEmail(userId, token);
        return Ok(result);
    }
}
