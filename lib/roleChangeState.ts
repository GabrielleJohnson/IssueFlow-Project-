export type RoleChangeState = {
  savedRole: string;
  selectedRole: string;
  pendingRole: string | null;
  error: string;
};

export type RoleChangeAction =
  | { type: "sync"; role: string }
  | { type: "select"; role: string }
  | { type: "cancel" }
  | { type: "saveSucceeded"; role: string }
  | { type: "saveFailed"; error: string };

export function createRoleChangeState(role: string): RoleChangeState {
  return { savedRole: role, selectedRole: role, pendingRole: null, error: "" };
}

export function roleChangeReducer(state: RoleChangeState, action: RoleChangeAction): RoleChangeState {
  switch (action.type) {
    case "sync":
      return createRoleChangeState(action.role);
    case "select":
      return {
        ...state,
        selectedRole: action.role,
        pendingRole: action.role === state.savedRole ? null : action.role,
        error: ""
      };
    case "cancel":
      return { ...state, selectedRole: state.savedRole, pendingRole: null, error: "" };
    case "saveSucceeded":
      return createRoleChangeState(action.role);
    case "saveFailed":
      return {
        ...state,
        selectedRole: state.savedRole,
        pendingRole: null,
        error: action.error
      };
  }
}
