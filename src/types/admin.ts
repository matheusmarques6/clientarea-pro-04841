export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'viewer' | 'admin' | 'super_admin' | 'support';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  status: string; // Changed to string to match database
  created_at: string;
  updated_at: string | null;
}

export interface AdminStore {
  id: string;
  client_id: string;
  name: string;
  country?: string | null;
  currency: string;
  status: string;
  created_at: string;
  updated_at?: string | null; // Made optional since it might not always be present
}

export interface UserStoreRole {
  id: string;
  user_id: string;
  store_id: string;
  role: 'owner' | 'manager' | 'viewer';
  created_at: string;
}

export interface Invite {
  id: string;
  client_id: string;
  store_id?: string;
  email: string;
  role: 'owner' | 'manager' | 'viewer';
  token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
  created_by: string;
  created_at: string;
}

export interface AdminAudit {
  id: string;
  admin_user_id: string;
  action: string;
  entity: string;
  entity_id?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AdminSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface AdminDashboardStats {
  totalClients: number;
  activeStores: number;
  activeUsers: number;
  openRequests: number;
}

export interface AdminUserWithStores extends AdminUser {
  store_roles?: Array<{
    store_id: string;
    store_name: string;
    role: string;
  }>;
}