-- AI Features Database Migration
-- Run this in Supabase SQL Editor

-- Enable pgvector extension (if not already enabled)
create extension if not exists vector;

-- Add AI-related columns to data_items table
alter table public.data_items 
add column if not exists extracted_text text,
add column if not exists raw_text text, -- Raw extracted text (before processing)
add column if not exists embedding vector(1536), -- OpenAI ada-002 uses 1536 dimensions
add column if not exists category text,
add column if not exists tags text[], -- Array of tags
add column if not exists ai_summary text;

-- Create index for vector similarity search
create index if not exists idx_data_items_embedding on public.data_items 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create index for category filtering
create index if not exists idx_data_items_category on public.data_items(category);

-- Create index for tags (GIN index for array searches)
create index if not exists idx_data_items_tags on public.data_items using gin(tags);

-- Add comment for documentation
comment on column public.data_items.extracted_text is 'Text extracted from file via OCR or direct text extraction (processed)';
comment on column public.data_items.raw_text is 'Raw text extracted from file before any processing';
comment on column public.data_items.embedding is 'Vector embedding for semantic search (OpenAI ada-002: 1536 dimensions)';
comment on column public.data_items.category is 'AI-generated category classification';
comment on column public.data_items.tags is 'AI-generated tags/keywords array';
comment on column public.data_items.ai_summary is 'AI-generated document summary';

