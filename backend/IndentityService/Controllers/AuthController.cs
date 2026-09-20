using IdentityService.Data;
using IdentityService.Models;
using IdentityService.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IdentityDbContext _context;
    private readonly JwtService _jwtService;
    private readonly IPasswordHasher<Usuario> _passwordHasher;

    public AuthController(
        IdentityDbContext context,
        JwtService jwtService,
        IPasswordHasher<Usuario> passwordHasher)
    {
        _context = context;
        _jwtService = jwtService;
        _passwordHasher = passwordHasher;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
        {
            return BadRequest(
                "El nombre es obligatorio."
            );
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(
                "El correo es obligatorio."
            );
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(
                "La contraseña es obligatoria."
            );
        }

        var email =
            request.Email.Trim().ToLowerInvariant();

        var existe =
            await _context.Usuarios
                .AnyAsync(u => u.Email == email);

        if (existe)
        {
            return Conflict(
                "El correo ya está registrado."
            );
        }

        var usuario = new Usuario
        {
            Nombre = request.Nombre.Trim(),
            Email = email,
            Rol = "Usuario",
            FechaCreacion = DateTime.Now
        };

        usuario.PasswordHash =
            _passwordHasher.HashPassword(
                usuario,
                request.Password
            );

        _context.Usuarios.Add(usuario);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje =
                "Usuario registrado correctamente.",
            usuario.Id,
            usuario.Nombre,
            usuario.Email,
            usuario.Rol
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(
                "Correo y contraseña son obligatorios."
            );
        }

        var email =
            request.Email.Trim().ToLowerInvariant();

        var usuario =
            await _context.Usuarios
                .FirstOrDefaultAsync(
                    u => u.Email == email
                );

        if (usuario == null)
        {
            return Unauthorized(
                "Correo o contraseña incorrectos."
            );
        }

        var resultado =
            _passwordHasher.VerifyHashedPassword(
                usuario,
                usuario.PasswordHash,
                request.Password
            );

        if (resultado ==
            PasswordVerificationResult.Failed)
        {
            return Unauthorized(
                "Correo o contraseña incorrectos."
            );
        }

        var token =
            _jwtService.GenerateToken(usuario);

        return Ok(
            new LoginResponse
            {
                Token = token,
                UsuarioId = usuario.Id,
                Nombre = usuario.Nombre,
                Email = usuario.Email,
                Rol = usuario.Rol
            }
        );
    }
}