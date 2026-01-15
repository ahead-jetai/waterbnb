# Refactor Command

Refactor the specified file(s) or code section to improve code quality, readability, and maintainability.

## Instructions

When refactoring, follow these steps:

1. **Analyze the target code** - Read and understand the current implementation, its purpose, and how it integrates with the rest of the codebase.

2. **Identify improvement opportunities**:
   - Code duplication that can be extracted into reusable functions/components
   - Long functions that should be broken into smaller, focused units
   - Complex conditionals that can be simplified
   - Unclear variable/function names that need improvement
   - Missing or incorrect TypeScript types
   - Violations of SOLID principles or React best practices
   - Performance issues (unnecessary re-renders, missing memoization)
   - Inconsistent code style

3. **Plan the refactoring** - Create a todo list of specific changes to make before implementing them.

4. **Apply refactoring patterns**:
   - **Extract Function/Component**: Move repeated logic into reusable units
   - **Rename**: Improve naming for clarity
   - **Inline**: Remove unnecessary abstractions
   - **Move**: Relocate code to more appropriate locations
   - **Simplify Conditionals**: Use early returns, guard clauses, or polymorphism
   - **Extract Constants**: Replace magic numbers/strings with named constants
   - **Consolidate Types**: Create shared type definitions

5. **Preserve behavior** - Ensure the refactored code maintains the same functionality. Do not change external APIs unless explicitly requested.

6. **Verify the changes**:
   - Check that TypeScript compilation passes
   - Ensure no lint errors are introduced
   - Confirm imports are correctly updated

## Usage

Provide the file path or describe the code you want refactored:

```
/refactor src/components/ListingCard.tsx
/refactor the booking form logic in ListingDetailPage
/refactor all components to use consistent naming conventions
```

## Arguments

$ARGUMENTS - The file path, component name, or description of what to refactor

## Output

After refactoring, provide:
- Summary of changes made
- Rationale for each significant change
- Any suggestions for further improvements
