using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using GameApi.DTOs;
using GameApi.Models;
using GameApi.Data.Context;
using Microsoft.EntityFrameworkCore;
using GameApi.Services;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly GameAppContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly ITokenService _tokenService;

    public AuthController(GameAppContext context, ILogger<AuthController> logger, ITokenService tokenService)
    {
        _context = context;
        _logger = logger;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<User>> Register(RegisterDto registerDto)
    {
        try
        {
            if (await _context.Users.AnyAsync(u => u.Username == registerDto.Username)) BadRequest("Username taken");
            if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email)) return BadRequest("Invalid registration attempt");

            using var hmac = new HMACSHA512();

            var user = new User
            {
                Username = registerDto.Username,
                Email = registerDto.Email,
                PasswordHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(registerDto.Password)),
                PasswordSalt = hmac.Key
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration Successful" });

        }

        catch (Exception e)
        {
            _logger.LogError(e, "Error during registration");
            return StatusCode(500, "An error occured during registration");
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<User>> Login(LoginDto loginDto)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.UsernameOrEmail || u.Username == loginDto.UsernameOrEmail);

            if (user == null)
            {
                return BadRequest("Invalid login attempt");
            }

            using var hmac = new HMACSHA512(user.PasswordSalt);
            var computedHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(loginDto.Password));

            for (int i = 0; i < computedHash.Length; i++)
            {
                if (computedHash[i] != user.PasswordHash[i]) return BadRequest("Invalid login attempt");
            }

            var token = _tokenService.CreateToken(user);

            return Ok(new { token });
        }

        catch (Exception e)
        {
            _logger.LogError(e, "Error during login");
            return StatusCode(500, "An error occured during login");
        }
    }
}