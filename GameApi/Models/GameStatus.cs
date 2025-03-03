namespace GameApi.Models;

public class GameStatus
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int GameId { get; set; }
    public Status Status { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.Now;

    public User User { get; set; } = null!;
    public Game Game { get; set; } = null!;
}