import React from 'react';
import { Redirect } from 'expo-router';

export default function RootIndexRedirect() {
  return <Redirect href="/home" />;
}
