using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GameApi.Data.Context;
using GameApi.Models;
using Microsoft.AspNetCore.Authorization;

namespace GameApi.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class GamesController : ControllerBase
{
    private readonly GameAppContext _context;
    private readonly ILogger<GamesController> _logger;

    public GamesController(GameAppContext context, ILogger<GamesController> logger)
    {
        _context = context;
        _logger = logger;
    }


    [HttpGet("{id}")]
    public async Task<ActionResult<Game>> GetGame(int id)
    {
        try
        {
            var game = await _context.Games
                .Include(g => g.Platforms)
                .Include(g => g.GameModes)
                .Include(g => g.Genres)
                .Include(g => g.Companies)
                .Include(g => g.Reviews)
                .Include(g => g.GameStatuses)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (game == null)
            {
                return NotFound();
            }

            return game;
        }
        catch (Exception e)
        {
            _logger.LogError(e, $"Error retrieving game with id {id}");
            return StatusCode(500, "An error occured while retrieving the game");
        }

    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Game>> UpdateGame(int id, Game game)
    {
        if (id != game.Id)
        {
            return BadRequest();
        }

        try
        {
            _context.Entry(game).State = EntityState.Modified;
            await _context.SaveChangesAsync();

        }
        catch (DbUpdateConcurrencyException ex)
        {
            if (!await GameExists(id))
            {
                return NotFound();
            }

            _logger.LogError(ex, "Concurrency error updating game {Id}", id);
            throw;
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error updating game");
            return StatusCode(500, "An error occured while updating the game");
        }


        return NoContent();
    }


    private async Task<bool> GameExists(int id)
    {
        return await _context.Games.AnyAsync(e => e.Id == id);
    }
}