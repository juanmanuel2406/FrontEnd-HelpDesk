using api.models.DTO;
using api.models.Responses;

namespace api.services.Repositories
{
    public interface IUserRepository
    {
        Task<LoginResponse> Login(UserLoginDTO user);
        Task<GeneralResponse> Register(UserRegisterDTO user, string baseUrl);
        Task<GeneralResponse> ConfirmEmail(int userId, string token);
    }
}