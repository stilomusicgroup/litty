/**
 * PlaylistPage — redirects to /stream (the user's single playlist view).
 * Old multi-playlist URLs now redirect to the unified playlist queue.
 */
import { Navigate } from 'react-router-dom';

const PlaylistPage: React.FC = () => <Navigate to="/stream" replace />;

import React from 'react';
export default PlaylistPage;
