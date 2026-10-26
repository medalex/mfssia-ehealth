using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Pilot.Services.Experiment;

namespace Pilot;

/// <summary>Entry point: dotnet run --project src/Pilot -- [--smoke | report | options]; see Runner.</summary>
public static class Program
{
    public static async Task<int> Main(string[] args)
    {
        // Configuration: appsettings.json next to the program, then environment variables. The arguments are the
        // runner's own (--smoke, --models ...), not configuration keys, so they are not given to the host.
        var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { ContentRootPath = AppContext.BaseDirectory });
        builder.Services.AddPilot(builder.Configuration);
        using var host = builder.Build();
        return await host.Services.GetRequiredService<Runner>().MainAsync(args);
    }
}
