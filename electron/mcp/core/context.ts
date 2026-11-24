import type { ProfilesData } from '../../../shared/profilesData.interface';
import type { McpDeps } from './deps';
import { ToolError } from './types';

const NO_PROFILE = 'No profile is open in CV Maker. Ask the user to open CV Maker and load their profile, then retry.';

/** One tool call: the app dependencies, with reads cached for the call. */
export class CallContext {
  private profilePromise: Promise<ProfilesData> | null = null;

  constructor(readonly deps: McpDeps) {}

  profile(): Promise<ProfilesData> {
    if (!this.profilePromise) {
      this.profilePromise = this.deps.getProfile().then((profile) => {
        if (!profile) throw new ToolError(NO_PROFILE);
        return profile;
      });
    }
    return this.profilePromise;
  }
}
