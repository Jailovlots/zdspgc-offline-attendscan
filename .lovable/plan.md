

## Plan: Organize Admin Dashboard by Course and Year Level

### What Changes

Add a **tabbed/grouped view** to the Admin Dashboard that separates students by course program (BSIS, ACT, BPEd), with sections visually grouped by year level within each course.

### Technical Approach

**1. Add Course Filter Tabs** at the top of the charts and table sections using the existing `Tabs` component:
- "All" | "BSIS" | "ACT" | "BPEd"

**2. Group `sectionData` by course and year** using a structured data model:

```text
BSIS
├── 3rd Year: 3A, 3B, 3C
└── 4th Year: 4A, 4B

ACT
├── 1st Year: 1A, 1B, 1C, 1D, 1E, 1F
└── 2nd Year: 2A, 2B, 2C, 2D, 2E

BPEd
├── 1st Year
├── 2nd Year
├── 3rd Year
└── 4th Year
```

**3. Filter bar chart data** based on the selected course tab so the chart is not overcrowded.

**4. Add year-level sub-headers** in the bar chart (via grouped labels) and in the Recent Scans table (via a course column or filter).

**5. Update the Recent Scans table** to add a "Course" column and filter it along with the selected tab.

**6. Update stats cards** to reflect filtered counts when a specific course tab is active.

### Files Modified

- `src/pages/AdminDashboard.tsx` — add course/year state, tabs, filtering logic, grouped display

