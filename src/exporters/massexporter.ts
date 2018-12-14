import { Game } from "../game";
import { Shortcuter } from "./steam";
import { IExporter } from "./exporter_iface";

export class MassExporter implements IExporter {
    public async sync(games: Game[], libPath: string): Promise<void> {
        let config = JSON.parse(libPath);
        let exporters = [
            { exp: new Shortcuter(), lib: config.Steam }
        ];
        await Promise.all(exporters.map(p => p.exp.sync(games, p.lib)));
    }
}