namespace GameApi.Models;

public class Review
{
    public int Id { get; set; }
    public int GameId { get; set; }
    public int UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int Rating { get; set; }  // Rating must be between 1-5
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public Game Game { get; set; } = null!;
    public User User { get; set; } = null!;


}