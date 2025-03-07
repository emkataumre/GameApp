using System.ComponentModel.DataAnnotations;

namespace GameApi.DTOs;

public class RegisterDto
{
    [Required]
    [StringLength(16, MinimumLength = 3)]
    public string Username { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; }

    [Required]
    [StringLength(50)]
    public string Password { get; set; }
}