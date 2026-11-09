using Pilot.Models.Policy;
using Pilot.Models.Scenario;

namespace Pilot.Services.ExperimentSetup;

/// <summary>Reads pilot/data/*.yaml into PilotData.</summary>
public sealed class PilotDataLoader(PilotPaths paths, YamlLoader yaml)
{
    private sealed record CustodiansFile(List<Custodian> Custodians);
    private sealed record TasksFile(List<PilotTask> Tasks);
    private sealed record ScenariosFile(string DoctorId, Dictionary<string, Patient> Patients);

    public PilotData Load()
    {
        var scenarios = yaml.Load<ScenariosFile>(DataFile("scenarios.yaml"));
        foreach (var (label, patient) in scenarios.Patients) patient.Label = label;
        return new PilotData
        {
            Custodians = yaml.Load<CustodiansFile>(DataFile("custodians.yaml")).Custodians,
            Policy = yaml.Load<PolicyFile>(DataFile("policy.yaml")),
            Tasks = yaml.Load<TasksFile>(DataFile("tasks.yaml")).Tasks,
            Patients = scenarios.Patients.Values.ToList(),
            DoctorId = scenarios.DoctorId,
        };
    }

    private string DataFile(string name) => Path.Combine(paths.DataDir, name);
}
