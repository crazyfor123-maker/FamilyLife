CREATE TABLE IF NOT EXISTS user_account (
  user_id VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  nickname VARCHAR(100),
  avatar VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS family_space (
  space_id VARCHAR(36) PRIMARY KEY,
  space_name VARCHAR(200) NOT NULL,
  creator_id VARCHAR(36) NOT NULL,
  cover VARCHAR(500),
  motto VARCHAR(500),
  description TEXT,
  founding_year INT,
  origin VARCHAR(500),
  member_count INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS space_member (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  edit_scope TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_space_user (space_id, user_id),
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (user_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invitation (
  token VARCHAR(36) PRIMARY KEY,
  space_id VARCHAR(36) NOT NULL,
  preset_role VARCHAR(20) DEFAULT 'member',
  max_uses INT DEFAULT 10,
  used_count INT DEFAULT 0,
  expires_at DATETIME,
  status VARCHAR(20) DEFAULT 'active',
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (created_by) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS person_profile (
  person_id VARCHAR(36) PRIMARY KEY,
  space_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10) DEFAULT 'unknown',
  birth_date VARCHAR(50),
  death_date VARCHAR(50),
  status VARCHAR(20) DEFAULT 'unknown',
  generation INT,
  avatar VARCHAR(500),
  birth_place VARCHAR(200),
  residence VARCHAR(200),
  occupation VARCHAR(200),
  education VARCHAR(200),
  bio TEXT,
  is_self TINYINT DEFAULT 0,
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (created_by) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kinship (
  relation_id VARCHAR(36) PRIMARY KEY,
  person_a_id VARCHAR(36) NOT NULL,
  person_b_id VARCHAR(36) NOT NULL,
  relation_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_a_id) REFERENCES person_profile(person_id),
  FOREIGN KEY (person_b_id) REFERENCES person_profile(person_id),
  UNIQUE KEY uk_person_relation (person_a_id, person_b_id, relation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interview_session (
  session_id VARCHAR(36) PRIMARY KEY,
  person_id VARCHAR(36) NOT NULL,
  space_id VARCHAR(36) NOT NULL,
  outline_id VARCHAR(36),
  ai_mode VARCHAR(20) DEFAULT 'cloud',
  status VARCHAR(20) DEFAULT 'draft',
  current_question_index INT DEFAULT 0,
  max_duration INT DEFAULT 30,
  tts_voice VARCHAR(100),
  tts_speed DECIMAL(3,1) DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES person_profile(person_id),
  FOREIGN KEY (space_id) REFERENCES family_space(space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interview_qa (
  qa_id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  question_text TEXT NOT NULL,
  answer_audio_url VARCHAR(500),
  transcript_raw TEXT,
  question_type VARCHAR(20) DEFAULT 'outline',
  parent_id VARCHAR(36),
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES interview_session(session_id),
  FOREIGN KEY (parent_id) REFERENCES interview_qa(qa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS life_book (
  book_id VARCHAR(36) PRIMARY KEY,
  person_id VARCHAR(36) NOT NULL,
  space_id VARCHAR(36),
  title VARCHAR(500),
  status VARCHAR(20) DEFAULT 'draft',
  visibility VARCHAR(20) DEFAULT 'self',
  current_version_id VARCHAR(36),
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES person_profile(person_id),
  FOREIGN KEY (space_id) REFERENCES family_space(space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS book_version (
  version_id VARCHAR(36) PRIMARY KEY,
  book_id VARCHAR(36) NOT NULL,
  version_number INT DEFAULT 1,
  chapters TEXT,
  word_count INT DEFAULT 0,
  pages INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES life_book(book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timeline_story (
  story_id VARCHAR(36) PRIMARY KEY,
  space_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  title VARCHAR(500),
  content TEXT,
  story_type VARCHAR(50) DEFAULT 'daily',
  happened_at DATETIME,
  images LONGTEXT,
  likes INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (author_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS family_event (
  event_id VARCHAR(36) PRIMARY KEY,
  space_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  event_type VARCHAR(50) DEFAULT 'other',
  event_date DATE,
  description TEXT,
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (created_by) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS family_message (
  message_id VARCHAR(36) PRIMARY KEY,
  space_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  message_type VARCHAR(50) DEFAULT 'daily',
  content TEXT,
  audio_url VARCHAR(500),
  is_private TINYINT DEFAULT 0,
  likes INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (author_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sync_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  operation VARCHAR(20) NOT NULL,
  data_payload TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS backup_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(500),
  file_size BIGINT,
  md5 VARCHAR(32),
  status VARCHAR(20) DEFAULT 'in_progress',
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (created_by) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS verification_code (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS search_index (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  search_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  searchable_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：TTS缓存 =====
CREATE TABLE IF NOT EXISTS tts_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(36) NOT NULL,
  question_index INT NOT NULL,
  text TEXT NOT NULL,
  audio_path VARCHAR(500),
  duration INT DEFAULT 0,
  voice VARCHAR(100),
  status VARCHAR(20) DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_session_question (session_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：ASR转写结果 =====
CREATE TABLE IF NOT EXISTS asr_transcripts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(36) NOT NULL,
  question_index INT NOT NULL,
  transcript TEXT NOT NULL,
  confidence DECIMAL(5,4) DEFAULT 0,
  language VARCHAR(10) DEFAULT 'zh-CN',
  audio_duration INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_session_question (session_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：AI对话历史 =====
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  model VARCHAR(100),
  tokens_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：AI分析结果 =====
CREATE TABLE IF NOT EXISTS ai_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(36),
  analytics_type VARCHAR(50) NOT NULL,
  analytics_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：AI Prompt模板 =====
CREATE TABLE IF NOT EXISTS ai_prompts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  prompt_name VARCHAR(100) NOT NULL,
  prompt_template TEXT NOT NULL,
  model_config TEXT,
  version INT DEFAULT 1,
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_prompt_name (prompt_name, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：OCR作业 =====
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  image_path VARCHAR(500),
  raw_text TEXT,
  parsed_data TEXT,
  status VARCHAR(20) DEFAULT 'processing',
  progress INT DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (user_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：OCR识别的人物 =====
CREATE TABLE IF NOT EXISTS ocr_persons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  person_name VARCHAR(100),
  gender VARCHAR(10),
  generation INT,
  birth_year VARCHAR(50),
  death_year VARCHAR(50),
  relations TEXT,
  confidence DECIMAL(5,4),
  needs_review TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES ocr_jobs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：书籍分享 =====
CREATE TABLE IF NOT EXISTS book_shares (
  id INT PRIMARY KEY AUTO_INCREMENT,
  book_id VARCHAR(36) NOT NULL,
  share_token VARCHAR(64) UNIQUE NOT NULL,
  permissions TEXT,
  max_views INT DEFAULT -1,
  expires_at DATETIME,
  view_count INT DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES life_book(book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：书籍分享访问记录 =====
CREATE TABLE IF NOT EXISTS book_share_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  share_token VARCHAR(64) NOT NULL,
  book_id VARCHAR(36) NOT NULL,
  viewer_ip VARCHAR(45),
  user_agent TEXT,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_share_token (share_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：书籍分享点赞记录 =====
CREATE TABLE IF NOT EXISTS book_share_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  share_token VARCHAR(64) NOT NULL,
  book_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_share_token (share_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：故事评论 =====
CREATE TABLE IF NOT EXISTS story_comments (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  parent_comment_id VARCHAR(36) DEFAULT NULL,
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES timeline_story(story_id),
  FOREIGN KEY (parent_comment_id) REFERENCES story_comments(id),
  FOREIGN KEY (author_id) REFERENCES user_account(user_id),
  INDEX idx_story (story_id),
  INDEX idx_parent (parent_comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：协同会话 =====
CREATE TABLE IF NOT EXISTS collab_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  book_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  creator_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  version INT DEFAULT 1,
  base_content TEXT,
  max_participants INT DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES life_book(book_id),
  FOREIGN KEY (creator_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：协同参与者 =====
CREATE TABLE IF NOT EXISTS collab_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  cursor_position INT DEFAULT 0,
  selection_start INT DEFAULT -1,
  selection_end INT DEFAULT -1,
  color VARCHAR(7) DEFAULT '#4A6741',
  is_active TINYINT DEFAULT 1,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_session_user (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES collab_sessions(session_id),
  FOREIGN KEY (user_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：协同操作历史 =====
CREATE TABLE IF NOT EXISTS collab_ops (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  op_type VARCHAR(20) NOT NULL,
  op_data TEXT NOT NULL,
  version INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：离线队列 =====
CREATE TABLE IF NOT EXISTS offline_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36),
  data_payload TEXT NOT NULL,
  local_version INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_user (user_id),
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (user_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：同步冲突 =====
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  local_data TEXT,
  remote_data TEXT,
  resolution_strategy VARCHAR(50),
  resolved TINYINT DEFAULT 0,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id),
  FOREIGN KEY (space_id) REFERENCES family_space(space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 新增表：云端文件 =====
CREATE TABLE IF NOT EXISTS cloud_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  space_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type VARCHAR(200),
  file_hash VARCHAR(64),
  is_public TINYINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_space (space_id),
  INDEX idx_user (user_id),
  FOREIGN KEY (space_id) REFERENCES family_space(space_id),
  FOREIGN KEY (user_id) REFERENCES user_account(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== 更新 family_message 表增加字段 =====
ALTER TABLE family_message ADD COLUMN wish_type VARCHAR(50) DEFAULT 'daily' AFTER message_type;
ALTER TABLE family_message ADD COLUMN reaction_emoji VARCHAR(10) DEFAULT NULL AFTER likes;
ALTER TABLE family_message ADD COLUMN parent_id VARCHAR(36) DEFAULT NULL AFTER is_private;
-- 跳过已存在的索引/列（init_db.js 会忽略 Duplicate/Unknown column 错误）
-- idx_wish_type
-- asr_confidence / asr_language

CREATE INDEX idx_space_member_user ON space_member(user_id);
CREATE INDEX idx_space_member_space ON space_member(space_id);
CREATE INDEX idx_person_space ON person_profile(space_id);
CREATE INDEX idx_session_person ON interview_session(person_id);
CREATE INDEX idx_session_space ON interview_session(space_id);
CREATE INDEX idx_story_space ON timeline_story(space_id);
CREATE INDEX idx_event_space ON family_event(space_id);
CREATE INDEX idx_message_space ON family_message(space_id);
CREATE INDEX idx_sync_status ON sync_queue(status);
CREATE INDEX idx_verification_phone ON verification_code(phone, created_at);
CREATE INDEX idx_tts_session ON tts_cache(session_id);
CREATE INDEX idx_asr_session ON asr_transcripts(session_id);
CREATE INDEX idx_ocr_status ON ocr_jobs(status);
CREATE INDEX idx_collab_status ON collab_sessions(status);
CREATE INDEX idx_offline_status ON offline_queue(status);
