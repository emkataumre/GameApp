namespace GameApi.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public byte[] PasswordHash { get; set; }
    public byte[] PasswordSalt { get; set; }

    public List<Review> Reviews { get; set; } = new();
    public List<GameStatus> GameStatuses { get; set; } = new();
}