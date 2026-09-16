namespace IdentityService.Models;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    public int UsuarioId { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Rol { get; set; } = string.Empty;
}