using IdentityService.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace IdentityService.Services;

public class JwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(Usuario usuario)
    {
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "No se encontró la clave JWT."
            );

        var issuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "No se encontró el issuer JWT."
            );

        var audience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "No se encontró el audience JWT."
            );

        var expirationMinutes =
            int.Parse(
                _configuration["Jwt:ExpirationMinutes"] ?? "60"
            );

        var claims = new List<Claim>
        {
            new(
                ClaimTypes.NameIdentifier,
                usuario.Id.ToString()
            ),
            new(
                ClaimTypes.Name,
                usuario.Nombre
            ),
            new(
                ClaimTypes.Email,
                usuario.Email
            ),
            new(
                ClaimTypes.Role,
                usuario.Rol
            )
        };

        var securityKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(key)
            );

        var credentials =
            new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256
            );

        var token =
            new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires:
                    DateTime.UtcNow.AddMinutes(
                        expirationMinutes
                    ),
                signingCredentials: credentials
            );

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}