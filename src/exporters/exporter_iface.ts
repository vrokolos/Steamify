import { Game } from "../game";
export interface IExporter {
    sync(games: Game[], libPath: string): Promise<void>;
}
