export interface User {
  id: string
  name: string
  email: string
  role: "ADMIN" | "PLANNER" | "OPERATOR"
}

export interface AuthResponse {
  access: string
  refresh: string
}

export interface Port {
  id: string
  name: string
  country: string
  timezone: string
}

export interface Berth {
  id: string
  port: string
  number: string
  length: string | null            // Comprimento do Berço (M)
  depth: string | null             // Profundidade (M)
  max_draft: string | null         // Calado Máximo E/S (M)
  max_loa: string | null           // LOA Máximo (M)
  max_beam: string | null          // Boca Máxima (M)
  max_air_draft: string | null     // Calado Aéreo Máximo (M)
  max_dwt: string | null           // DWT (Ton)
  default_ship_type: string        // Tipo de Navio Padrão
  crane_capacity_min: string | null // Capac. Guindaste min (Ton)
  max_ship_age: number | null      // Idade Máxima (Anos)
  position_start: string | null
  position_end: string | null
  active: boolean
}

export interface CargoType {
  id: string
  name: string
  category: string
  default_prancha: string | null
}

export interface BerthCargo {
  id: string
  berth: string
  cargo_type: string
  max_prancha: string | null
  priority: number
}

export interface LineupEntry {
  id: string
  ship: string
  ship_name?: string
  berth: string
  start_time: string
  end_time: string
  position: number
  position_start: string | null
  position_end: string | null
  source: "MANUAL" | "AUTOMATIC" | "SHIFTING"
  berthing_request: string | null
}

export interface TimelineGroup {
  berth_id: string
  berth_number: string
  port: string
  entries: LineupEntry[]
}

export interface BerthingRequest {
  id: string
  ship: string
  client: string
  cargo_type: string | null
  cargo_quantity: string | null
  eta: string
  operation_type: "LOAD" | "DISCHARGE" | "STS"
  status: "WAITING" | "SCHEDULED" | "OPERATING" | "FINISHED" | "BYPASS" | "CANCELLED"
  bypass: boolean
  bypass_reason: string
  bypass_time: string | null
  created_at: string
  mother_ship: string | null
  daughter_ship: string | null
}

export interface GenerateResult {
  generated: number
  fitness: number
  generations_run: number
  schedule: {
    lineup_id: string
    request_id: string
    berth: string
    ship: string
    start_time: string
    end_time: string
  }[]
}

export interface SimulateScenarioResult {
  assignments: {
    request_id: string
    berth_id: string
    ship_id: string
    start_time: string
    end_time: string
  }[]
  metrics: {
    total_assignments: number
    total_wait_hours: number
    unassigned: number
  }
}

export interface Perturbation {
  type: "delay_eta" | "rain" | "cancel"
  request_id: string
  hours?: number
}

export interface BerthMapEntry {
  berth_id: string
  berth_number: string
  berth_length: string
  ships: {
    lineup_id: string
    ship_id: string
    ship_name: string
    client: string
    cargo: string
    cargo_category: string
    operation_type: string
    eta: string
    etd: string
    source: string
    position_start: string
    position_end: string
  }[]
}

export interface DashboardStats {
  berths: { total: number; occupied: number; free: number }
  ships: { waiting: number; scheduled: number; operating: number; finished_today: number }
}

export interface PortAlert {
  id: string
  type: string
  message: string
  severity: "INFO" | "WARNING" | "CRITICAL"
  created_at: string
  resolved: boolean
}
