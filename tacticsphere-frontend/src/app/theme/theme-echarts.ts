import { EChartsOption } from 'echarts';

export const tsMonoTheme: EChartsOption = {
  color: ['#0f0f0f', '#6b7280', '#111111', '#1f2937'],
  textStyle: {
    fontFamily: 'Inter, sans-serif',
    color: '#0f0f0f',
  },
  axisPointer: {
    lineStyle: { color: '#111111' },
  },
  grid: {
    containLabel: true,
  },
  axisLabel: {
    color: '#1f2937',
  },
  xAxis: {
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    splitLine: { lineStyle: { color: '#e5e7eb' } },
  },
  yAxis: {
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    splitLine: { lineStyle: { color: '#e5e7eb' } },
    axisLabel: { color: '#6b7280' },
  },
  tooltip: {
    backgroundColor: '#111111',
    borderColor: '#111111',
    textStyle: { color: '#ffffff' },
  },
  legend: { textStyle: { color: '#0f0f0f' } },
  bar: {
    itemStyle: { borderRadius: [8, 8, 0, 0] },
  },
  line: {
    lineStyle: { width: 2 },
    areaStyle: { opacity: 0.1 },
  },
  radar: {
    splitLine: { lineStyle: { color: ['#e5e7eb'] } },
  },
};
