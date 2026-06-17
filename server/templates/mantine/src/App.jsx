// Starter Mantine v7 + TanStack Table — Dashboard complet
// AppShell (nav + header) · Stats KPI · BarChart · Table triable/filtrable
// Décris le dashboard dans le chat : Mango adapte les données, colonnes, graphiques
import { useState, useMemo } from 'react';
import {
  MantineProvider, AppShell, Burger, Group, Title, NavLink,
  Text, SimpleGrid, Paper, Badge, TextInput, Table, ScrollArea,
  createTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BarChart } from '@mantine/charts';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
} from '@tanstack/react-table';
import {
  LayoutDashboard, Table2, BarChart2, Settings,
  TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign,
} from 'lucide-react';

const theme = createTheme({ primaryColor: 'violet' });

// ── Données de démo ──────────────────────────────────────
const STATS = [
  { label: 'Revenus', value: '€48 295', trend: '+18 %', up: true, icon: DollarSign },
  { label: 'Clients',  value: '1 248',   trend: '+5 %',  up: true, icon: Users },
  { label: 'Commandes',value: '342',     trend: '−3 %',  up: false, icon: ShoppingCart },
];

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  nom: ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'Georges'][i % 7] + ` ${i + 1}`,
  statut: ['Actif', 'En attente', 'Inactif'][i % 3],
  montant: +(Math.random() * 5000 + 100).toFixed(2),
  date: new Date(2026, i % 12, (i % 28) + 1).toLocaleDateString('fr-FR'),
}));

const CHART = ['Jan','Fév','Mar','Avr','Mai','Jun'].map((mois) => ({
  mois,
  revenus: Math.round(Math.random() * 8000 + 2000),
  commandes: Math.round(Math.random() * 150 + 30),
}));

// ── Tableau TanStack ─────────────────────────────────────
function DataTable() {
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(() => [
    { accessorKey: 'id',     header: '#',       size: 60 },
    { accessorKey: 'nom',    header: 'Nom' },
    {
      accessorKey: 'statut', header: 'Statut',
      cell: ({ getValue }) => {
        const v = getValue();
        const color = v === 'Actif' ? 'green' : v === 'En attente' ? 'yellow' : 'gray';
        return <Badge color={color} variant="light" size="sm">{v}</Badge>;
      },
    },
    {
      accessorKey: 'montant', header: 'Montant',
      cell: ({ getValue }) => `€${getValue().toLocaleString('fr-FR')}`,
    },
    { accessorKey: 'date', header: 'Date' },
  ], []);

  const table = useReactTable({
    data: ROWS,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <TextInput
        placeholder="Rechercher…"
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        mb="md"
      />
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            {table.getHeaderGroups().map(hg => (
              <Table.Tr key={hg.id}>
                {hg.headers.map(h => (
                  <Table.Th
                    key={h.id}
                    style={{ cursor: h.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted()] ?? ''}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.map(row => (
              <Table.Tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <Table.Td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Text size="xs" c="dimmed" mt="xs">
        {table.getFilteredRowModel().rows.length} ligne(s)
      </Text>
    </>
  );
}

// ── App principale ────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'table',     label: 'Données',          icon: Table2 },
  { id: 'charts',    label: 'Graphiques',        icon: BarChart2 },
  { id: 'settings',  label: 'Paramètres',        icon: Settings },
];

export default function App() {
  const [opened, { toggle }] = useDisclosure();
  const [page, setPage] = useState('dashboard');

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AppShell
        header={{ height: 56 }}
        navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>MonDashboard</Title>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="xs">
          {NAV.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              label={label}
              leftSection={<Icon size={16} />}
              active={page === id}
              onClick={() => setPage(id)}
            />
          ))}
        </AppShell.Navbar>

        <AppShell.Main>
          {page === 'dashboard' && (
            <>
              <Title order={3} mb="md">Vue d'ensemble</Title>
              <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
                {STATS.map(({ label, value, trend, up, icon: Icon }) => (
                  <Paper key={label} withBorder p="md" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" c="dimmed">{label}</Text>
                      <Icon size={18} />
                    </Group>
                    <Text fw={700} size="xl">{value}</Text>
                    <Group gap="xs" mt="xs">
                      {up
                        ? <TrendingUp size={14} color="teal" />
                        : <TrendingDown size={14} color="red" />}
                      <Text size="xs" c={up ? 'teal' : 'red'}>{trend}</Text>
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="sm">Revenus 6 mois</Title>
                <BarChart
                  h={220}
                  data={CHART}
                  dataKey="mois"
                  series={[{ name: 'revenus', color: 'violet' }]}
                />
              </Paper>
            </>
          )}

          {page === 'table' && (
            <>
              <Title order={3} mb="md">Données clients</Title>
              <Paper withBorder p="md" radius="md">
                <DataTable />
              </Paper>
            </>
          )}

          {page === 'charts' && (
            <>
              <Title order={3} mb="md">Graphiques</Title>
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="sm">Revenus vs Commandes</Title>
                <BarChart
                  h={260}
                  data={CHART}
                  dataKey="mois"
                  series={[
                    { name: 'revenus',    color: 'violet' },
                    { name: 'commandes',  color: 'cyan' },
                  ]}
                />
              </Paper>
            </>
          )}

          {page === 'settings' && <Title order={3}>Paramètres</Title>}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
