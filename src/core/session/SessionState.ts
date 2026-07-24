export type DemoUser = Readonly<{
  id: string;
  displayName: string;
  role: 'INSTRUCTOR';
}>;

export type SessionState =
  | Readonly<{ status: 'booting' }>
  | Readonly<{ status: 'anonymous' }>
  | Readonly<{
      status: 'authenticated';
      user: DemoUser;
      permissions: ReadonlySet<string>;
    }>;
