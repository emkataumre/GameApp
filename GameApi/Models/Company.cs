namespace GameApi.Models;

public class Company
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Role Role { get; set; } = new();

    public List<Game> Games { get; set; } = new();
}