CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: game_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_code text NOT NULL,
    max_players integer DEFAULT 50,
    win_condition_food integer DEFAULT 100,
    status text DEFAULT 'waiting'::text,
    winner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    bet_amount numeric DEFAULT 0.05,
    pot_amount numeric DEFAULT 0,
    required_players integer DEFAULT 3,
    lobby_start_time timestamp with time zone,
    game_start_countdown timestamp with time zone,
    payout_signature text,
    payout_processed_at timestamp with time zone,
    team_fee_amount numeric,
    winner_amount numeric
);


--
-- Name: matchmaking_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matchmaking_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_name text NOT NULL,
    wallet_address text NOT NULL,
    bet_transaction_signature text NOT NULL,
    skin_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'searching'::text NOT NULL,
    CONSTRAINT matchmaking_queue_status_check CHECK ((status = ANY (ARRAY['searching'::text, 'matched'::text, 'cancelled'::text])))
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    player_name text NOT NULL,
    wallet_address text,
    score real DEFAULT 0,
    is_alive boolean DEFAULT true,
    position_x real,
    position_y real,
    created_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    last_game_ended_at timestamp with time zone,
    bet_transaction_signature text,
    has_paid boolean DEFAULT false,
    skin_id integer,
    refund_signature text,
    refund_processed_at timestamp with time zone
);


--
-- Name: spin_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spin_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_address text NOT NULL,
    hash_code text,
    is_winner boolean DEFAULT false NOT NULL,
    transaction_signature text,
    spin_cost numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    test_mode boolean DEFAULT false NOT NULL
);


--
-- Name: game_sessions game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- Name: game_sessions game_sessions_session_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_session_code_key UNIQUE (session_code);


--
-- Name: matchmaking_queue matchmaking_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matchmaking_queue
    ADD CONSTRAINT matchmaking_queue_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: spin_results spin_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spin_results
    ADD CONSTRAINT spin_results_pkey PRIMARY KEY (id);


--
-- Name: idx_matchmaking_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matchmaking_queue_status ON public.matchmaking_queue USING btree (status, created_at);


--
-- Name: idx_players_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_score ON public.players USING btree (score DESC);


--
-- Name: idx_players_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_session ON public.players USING btree (session_id);


--
-- Name: idx_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_status ON public.game_sessions USING btree (status);


--
-- Name: idx_spin_results_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spin_results_hash ON public.spin_results USING btree (hash_code) WHERE (hash_code IS NOT NULL);


--
-- Name: idx_spin_results_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spin_results_wallet ON public.spin_results USING btree (wallet_address);


--
-- Name: unique_transaction_signature; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_transaction_signature ON public.players USING btree (bet_transaction_signature) WHERE (bet_transaction_signature IS NOT NULL);


--
-- Name: unique_wallet_per_session; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_wallet_per_session ON public.players USING btree (session_id, wallet_address) WHERE (wallet_address IS NOT NULL);


--
-- Name: players players_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: game_sessions Anyone can create game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create game sessions" ON public.game_sessions FOR INSERT WITH CHECK (true);


--
-- Name: matchmaking_queue Anyone can delete from matchmaking queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete from matchmaking queue" ON public.matchmaking_queue FOR DELETE USING (true);


--
-- Name: matchmaking_queue Anyone can join matchmaking queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can join matchmaking queue" ON public.matchmaking_queue FOR INSERT WITH CHECK (true);


--
-- Name: game_sessions Anyone can update game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update game sessions" ON public.game_sessions FOR UPDATE USING (true);


--
-- Name: matchmaking_queue Anyone can update matchmaking queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update matchmaking queue" ON public.matchmaking_queue FOR UPDATE USING (true);


--
-- Name: game_sessions Anyone can view game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view game sessions" ON public.game_sessions FOR SELECT USING (true);


--
-- Name: matchmaking_queue Anyone can view matchmaking queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view matchmaking queue" ON public.matchmaking_queue FOR SELECT USING (true);


--
-- Name: players Anyone can view players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);


--
-- Name: players Only service role can delete players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can delete players" ON public.players FOR DELETE USING ((auth.role() = 'service_role'::text));


--
-- Name: players Only service role can insert players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can insert players" ON public.players FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: players Only service role can update players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service role can update players" ON public.players FOR UPDATE USING ((auth.role() = 'service_role'::text));


--
-- Name: spin_results Users can insert their own spin results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own spin results" ON public.spin_results FOR INSERT WITH CHECK (true);


--
-- Name: spin_results Users can view their own spin results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own spin results" ON public.spin_results FOR SELECT USING (true);


--
-- Name: game_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: matchmaking_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- Name: spin_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spin_results ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


