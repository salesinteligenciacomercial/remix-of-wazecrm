-- ============================================
-- 🔧 Sistema de Tarefas estilo Trello
-- ============================================

-- 🔹 Quadros de tarefas (boards)
CREATE TABLE IF NOT EXISTS task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔹 Colunas (listas dentro do quadro)
CREATE TABLE IF NOT EXISTS task_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES task_boards(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  posicao INT DEFAULT 0,
  cor TEXT DEFAULT '#6b7280',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔹 Atualizar tabela tasks para incluir board e column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES task_boards(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL;

-- 🔹 Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_task_columns_board_id ON task_columns(board_id);

-- 🔹 Habilitar RLS nos quadros
ALTER TABLE task_boards ENABLE ROW LEVEL SECURITY;

-- 🔹 Políticas RLS para task_boards
CREATE POLICY "Users can create boards"
  ON task_boards FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view their company boards"
  ON task_boards FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their company boards"
  ON task_boards FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company boards"
  ON task_boards FOR DELETE
  USING (owner_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- 🔹 Habilitar RLS nas colunas
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;

-- 🔹 Políticas RLS para task_columns
CREATE POLICY "Users can create columns"
  ON task_columns FOR INSERT
  WITH CHECK (board_id IN (SELECT id FROM task_boards WHERE owner_id = auth.uid()));

CREATE POLICY "Users can view columns from their boards"
  ON task_columns FOR SELECT
  USING (board_id IN (SELECT id FROM task_boards WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update columns from their boards"
  ON task_columns FOR UPDATE
  USING (board_id IN (SELECT id FROM task_boards WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete columns from their boards"
  ON task_columns FOR DELETE
  USING (board_id IN (SELECT id FROM task_boards WHERE owner_id = auth.uid()));

-- 🔹 Triggers para atualizar timestamps
CREATE TRIGGER update_task_boards_updated_at
  BEFORE UPDATE ON task_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_columns_updated_at
  BEFORE UPDATE ON task_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();