using api.models.DTO;
using api.models.Entities;
using api.models.Responses;
using api.services.Handlers;
using api.services.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace api.services.v1
{
    public class UserService : IUserRepository
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IEmailSender<AppUser> _emailSender;

        public UserService(UserManager<AppUser> userManager, IConfiguration configuration, IEmailSender<AppUser> emailSender)
        {
            _userManager = userManager;
            _configuration = configuration;
            _emailSender = emailSender;
        }

        public async Task<LoginResponse> Login(UserLoginDTO user)
        {
            LoginResponse result = new();

            var appUser = await _userManager.FindByNameAsync(user.Username);

            if (appUser == null)
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "Credenciales invalidas";
                result.Token = string.Empty;
                return result;
            }

            if (!await _userManager.CheckPasswordAsync(appUser, user.Password))
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "Credenciales invalidas";
                result.Token = string.Empty;
                return result;
            }

            if (!await _userManager.IsEmailConfirmedAsync(appUser))
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "Debes confirmar tu correo electronico antes de iniciar sesion";
                result.Token = string.Empty;
                return result;
            }

            if (appUser.Active != "T")
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "Usuario inactivo";
                result.Active = appUser.Active;
                result.Token = string.Empty;
                return result;
            }

            appUser.Last_Login = DateTime.Now;
            await _userManager.UpdateAsync(appUser);

            JwtHandler jwt = new(_configuration);

            result.Estado = true;
            result.Codigo = 1;
            result.Mensaje = "Login exitoso";
            result.UserId = appUser.Id;
            result.Username = appUser.UserName;
            result.Role = appUser.Role;
            result.Active = appUser.Active;
            result.Token = jwt.CrearJWT(appUser.UserName, appUser.Id, appUser.Fullname, appUser.Role);

            return result;
        }

        public async Task<GeneralResponse> Register(UserRegisterDTO user, string baseUrl)
        {
            GeneralResponse result = new();

            var existingUser = await _userManager.FindByNameAsync(user.Username);
            if (existingUser != null)
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "El nombre de usuario ya existe";
                return result;
            }

            var existingEmail = await _userManager.FindByEmailAsync(user.Email);
            if (existingEmail != null)
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "El correo electronico ya esta registrado";
                return result;
            }

            var appUser = new AppUser
            {
                UserName = user.Username,
                Email = user.Email,
                Fullname = user.Fullname,
                Role = "user",
                Active = "T"
            };

            var createResult = await _userManager.CreateAsync(appUser, user.Password);

            if (!createResult.Succeeded)
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = string.Join(". ", createResult.Errors.Select(e => e.Description));
                return result;
            }

            var token = await _userManager.GenerateEmailConfirmationTokenAsync(appUser);
            var encodedToken = Uri.EscapeDataString(token);
            var confirmationLink = $"{baseUrl}/api/v1/user/confirm-email?userId={appUser.Id}&token={encodedToken}";

            try
            {
                await _emailSender.SendConfirmationLinkAsync(appUser, user.Email, confirmationLink);
            }
            catch (Exception)
            {
                await _userManager.DeleteAsync(appUser);

                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "No se pudo enviar el correo de confirmacion. Intenta registrarte nuevamente mas tarde.";
                return result;
            }

            result.Estado = true;
            result.Codigo = 1;
            result.Mensaje = "Usuario registrado correctamente. Revisa tu correo para confirmar la cuenta.";

            return result;
        }

        public async Task<GeneralResponse> ConfirmEmail(int userId, string token)
        {
            GeneralResponse result = new();

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "Usuario no encontrado";
                return result;
            }

            var decodedToken = Uri.UnescapeDataString(token);
            var confirmResult = await _userManager.ConfirmEmailAsync(user, decodedToken);

            if (!confirmResult.Succeeded)
            {
                result.Estado = false;
                result.Codigo = 0;
                result.Mensaje = "El enlace de confirmacion es invalido o ha expirado";
                return result;
            }

            result.Estado = true;
            result.Codigo = 1;
            result.Mensaje = "Correo electronico confirmado exitosamente. Ya puedes iniciar sesion.";

            return result;
        }
    }
}
