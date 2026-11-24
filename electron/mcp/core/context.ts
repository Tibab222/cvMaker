import type { Application } from '../../../shared/jobApplications.type';
import type { ProfilesData } from '../../../shared/profilesData.interface';
import type { McpDeps } from './deps';
import { resolveHandle } from './handles';
import { ToolError } from './types';

const NO_PROFILE = 'No profile is open in CV Maker. Ask the user to open CV Maker and load their profile, then retry.';

/** One tool call: the app dependencies, with reads cached for the call. */
export class CallContext {
  private profilePromise: Promise<ProfilesData> | null = null;
  private applicationList: Application[] | null = null;

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

  /** The user's applications; throws when no profile is open. */
  applications(): Application[] {
    if (!this.deps.applications.isReady()) throw new ToolError(NO_PROFILE);
    this.applicationList ??= this.deps.applications.list();
    return this.applicationList;
  }

  application(handle: string): Application {
    const application = resolveHandle('application', handle, this.applications(), (app) => app.id);
    if (!application) throw new ToolError(`No application ${handle}: list_applications gives the handles.`);
    return application;
  }
}
