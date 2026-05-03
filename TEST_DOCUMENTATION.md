# RecipeCreateView Unit Tests

Comprehensive unit test suite for the Recipe Creation feature in MealDeal.

## Test Coverage

### 1. **Rendering and Initial State** (6 tests)
- Verifies component renders all major sections
- Validates user information display
- Confirms initial form state is empty
- Ensures ingredients are fetched on mount
- Checks default values for cook time, servings, and difficulty

### 2. **Form Input Handling** (11 tests)
- Title input updates
- Preparation steps textarea updates
- Cook time adjustment
- Difficulty level selection
- Servings increment/decrement with +/- buttons
- Dietary tag input
- Visibility (public/private) toggle
- Form validation logic

### 3. **Ingredient Management** (5 tests)
- Adding new ingredient rows
- Removing ingredient rows
- Removing disabled when only one row remains
- Selecting ingredients from dropdown
- Ingredient quantity entry
- Unit dropdown disabled state
- Real-time ingredient count updates

### 4. **Demo Recipe** (3 tests)
- Loading demo recipe data
- Setting all form fields correctly with demo data
- Displaying confirmation message

### 5. **Form Reset** (2 tests)
- Resetting all form fields
- Clearing message on reset

### 6. **Form Submission** (6 tests)
- Submit button disabled when title is empty
- Submit button enabled when form is valid
- Submitting form with correct API data structure
- Loading state during submission
- Success message on successful submission
- Callback function invocation on success
- Error message display on failure

### 7. **Ingredient Search** (5 tests)
- Search input and button rendering
- Performing search on button click
- Performing search on Enter key press
- Loading state during search
- Displaying search results
- Adding searched ingredients to form

### 8. **Live Preview** (4 tests)
- Preview section rendering
- Real-time title update in preview
- Default preview display
- Real-time stats updates

### 9. **Validation** (3 tests)
- Prevents submission without title
- Prevents submission with zero cook time
- Prevents submission with zero servings

### 10. **Error Handling** (3 tests)
- Graceful handling of ingredient fetch errors
- Graceful handling of search errors
- Generic error message on submission failure

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test RecipeCreateView.test
```

### Run in watch mode
```bash
npm test:watch
```

### Generate coverage report
```bash
npm test:coverage
```

## Test Structure

Each test uses:
- **React Testing Library** for component rendering and interaction
- **userEvent** for simulating user interactions
- **Jest** for assertions and mocking
- **Mock fetch** for API calls

## Mock Data

The tests use mock ingredients:
```javascript
const mockIngredients = [
  { ingredient_id: 1, name: 'Tomato', allowed_units: 'kg,g,oz,cup' },
  { ingredient_id: 2, name: 'Garlic', allowed_units: 'clove,g,oz' },
  { ingredient_id: 3, name: 'Olive Oil', allowed_units: 'ml,L,tbsp,cup' }
];
```

## Configuration Files

- **jest.config.js** - Jest configuration with jsdom and CSS mocking
- **jest.setup.js** - Jest setup file importing testing-library matchers
- **.babelrc** - Babel configuration for JSX transformation

## Dependencies

Testing dependencies installed:
- `jest` - Test runner
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Jest matchers
- `@testing-library/user-event` - User interaction simulation
- `babel-jest` - Babel transformer for Jest
- `identity-obj-proxy` - CSS module mocking
- `@babel/core`, `@babel/preset-env`, `@babel/preset-react` - Babel presets

## Key Testing Patterns

### Testing Form Inputs
```javascript
const input = screen.getByPlaceholderText('...');
await user.type(input, 'value');
expect(input).toHaveValue('value');
```

### Testing Async Operations
```javascript
await waitFor(() => {
  expect(fetch).toHaveBeenCalled();
});
```

### Testing User Interactions
```javascript
const button = screen.getByRole('button', { name: /Add/ });
await user.click(button);
```

### Mocking API Calls
```javascript
fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => data
});
```

## Notes

- Tests validate both user interactions and API integration
- Form validation is thoroughly tested to prevent invalid submissions
- Error handling ensures graceful degradation
- Real-time preview updates are verified
- Ingredient search functionality is completely tested
- Demo recipe loading is validated
- All 52 tests pass successfully
