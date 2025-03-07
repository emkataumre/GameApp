using System.ComponentModel.DataAnnotations;

namespace GameApi.DTOs;

public class LoginDto
{
    [Required]
    public string UsernameOrEmail { get; set; }

    [Required]
    [StringLength(50)]
    public string Password { get; set; } = string.Empty;
}
