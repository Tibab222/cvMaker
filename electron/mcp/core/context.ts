import type { DiscoveredJob } from '../../../shared/discovery.types';
import type { Application } from '../../../shared/jobApplications.type';
import type { McpPermissionId, McpPermissions } from '../../../shared/mcp.types';
import type { ProfilesData } from '../../../shared/profilesData.interface';
import type { McpDeps } from './deps';
import { resolveHandle } from './handles';
import { ToolError, turnedOff } from './types';

const NO_PROFILE = 'No profile is open in CV Maker. Ask the user to open CV Maker and load their profile, then retry.';

/** One tool call: the app dependencies, with reads cached for the call. */
export class CallContext {
  private profilePromise: Promise<ProfilesData> | null = null;
  private applicationList: Application[] | null = null;
  private opportunityList: DiscoveredJob[] | null = null;

  private readonly permissions: McpPermissions;

  constructor(readonly deps: McpDeps) {
    this.permissions = deps.permissions();
  }

  /** For the parts of an answer that depend on another permission than the tool's own. */
  allows(permission: McpPermissionId): boolean {
    return this.permissions[permission];
  }

  need(permission: McpPermissionId): void {
    if (!this.permissions[permission]) throw new ToolError(turnedOff(permission));
  }

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

  opportunities(): DiscoveredJob[] {
    if (!this.deps.applications.isReady()) throw new ToolError(NO_PROFILE);
    this.opportunityList ??= this.deps.opportunities.list();
    return this.opportunityList;
  }

  opportunity(handle: string): DiscoveredJob {
    const job = resolveHandle('opportunity', handle, this.opportunities(), (offer) => offer.id);
    if (!job) throw new ToolError(`No opportunity ${handle}: list_opportunities gives the handles.`);
    return job;
  }
}
