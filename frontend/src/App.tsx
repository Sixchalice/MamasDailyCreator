import React, { useState, useEffect } from 'react';
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Checkbox,
  FormControlLabel,
} from '@material-ui/core';
import './style.css';

/**
 * API base for FastAPI.
 * - Set `VITE_API_BASE_URL` in `frontend/.env` (e.g. `http://127.0.0.1:9000`) to override.
 * - In dev, defaults to `http://127.0.0.1:9000` so `/api/*` hits the backend even when Vite’s proxy does not.
 * - In production builds, omit the env var to use same-origin `/api` (e.g. nginx → backend).
 */
function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:9000';
  }
  return '';
}

function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

interface ClassReview {
  type: string;
  title: string;
}

function App() {
  const [course, setCourse] = useState<string>('');
  const [courses, setCourses] = useState<string[]>([]);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [maxWeek, setMaxWeek] = useState<number>(60);
  const [classReviewTypes, setClassReviewTypes] = useState<string[]>([]);
  const [classReviews, setClassReviews] = useState<ClassReview[]>([]);
  const [newReview, setNewReview] = useState<ClassReview>({
    type: '',
    title: '',
  });
  const [dailyQuestion, setDailyQuestion] = useState<string>('');
  const [includeDailyQuestion, setIncludeDailyQuestion] =
    useState<boolean>(false);
  const [includeShareQuestion, setIncludeShareQuestion] =
    useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingReview, setEditingReview] = useState<ClassReview>({
    type: '',
    title: '',
  });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [submitResponse, setSubmitResponse] = useState<string>('');

  useEffect(() => {
    const fetchJson = (path: string) =>
      fetch(apiUrl(path), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`${path} → HTTP ${response.status}`);
        }
        return response.json();
      });

    fetchJson('/api/courses')
      .then((data) => {
        setCourses(data);
      })
      .catch((error) => {
        setSubmitResponse(error.toString());
      });

    fetchJson('/api/reviewTypes')
      .then((data) => {
        setClassReviewTypes(data);
      })
      .catch((error) => {
        setSubmitResponse(error.toString());
      });

    fetchJson('/api/weeks')
      .then((data: { minWeek: number; maxWeek: number }) => {
        setMaxWeek(data.maxWeek);
        setWeekNumber((w) =>
          w >= data.minWeek && w <= data.maxWeek ? w : data.minWeek
        );
      })
      .catch((error) => {
        setSubmitResponse(error.toString());
      });
  }, []);
  const handleCourseChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setCourse(e.target.value as string);
  };

  const handleWeekChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setWeekNumber(Number(e.target.value));
  };

  const handleReviewTypeChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    if (editingIndex === -1) {
      setNewReview({
        ...newReview,
        type: e.target.value as string,
      });
    } else {
      setEditingReview({
        ...editingReview,
        type: e.target.value as string,
      });
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingIndex === -1) {
      setNewReview({
        ...newReview,
        title: e.target.value,
      });
    } else {
      setEditingReview({
        ...editingReview,
        title: e.target.value,
      });
    }
  };

  const handleAddReview = () => {
    if (editingIndex === -1) {
      setClassReviews([...classReviews, newReview]);
    } else {
      const updatedReviews = [...classReviews];
      updatedReviews[editingIndex] = editingReview;
      setClassReviews(updatedReviews);
      setEditingIndex(-1);
      setEditingReview({ type: '', title: '' });
    }

    setNewReview({
      type: '',
      title: '',
    });
  };

  const handleEditReview = (index: number) => {
    setEditingIndex(index);
    setEditingReview(classReviews[index]);
  };

  const handleDeleteReview = (index: number) => {
    const updatedReviews = [...classReviews];
    updatedReviews.splice(index, 1);
    setClassReviews(updatedReviews);
  };

  const handleDailyQuestionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDailyQuestion(e.target.value);
  };

  const handleIncludeDailyQuestionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setIncludeDailyQuestion(e.target.checked);
  };

  const handleIncludeShareQuestionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setIncludeShareQuestion(e.target.checked);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleSubmit = () => {
    setSubmitResponse("מחכה לתשובה...")
    const dataToSend: Record<string, unknown> = {
      course,
      classReviews,
      weekNumber,
      includeShareQuestion,
    };

    if (includeDailyQuestion && dailyQuestion) {
      dataToSend['dailyQuestion'] = dailyQuestion;
    }

    if (selectedDate) {
      dataToSend['selectedDate'] = selectedDate;
    }

    fetch(apiUrl('/api/submit'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
    })
      .then(response => response.json())
      .then(data => {
        console.log('API Response:', data);
        setSubmitResponse(data["message"])
      })
      .catch(error => {
        console.error('API Error:', error);
        setSubmitResponse(error.toString())
      });
  };

  return (
    <div className='App rtl'>
      <div className='form-container'>
        <header className='header'>יצירת מישוב יומי</header>
		
              <input
                type='date'
                id='dailyQuestionDate'
                value={selectedDate}
                onChange={handleDateChange}
              />
        <FormControl className='course-select'>
          <InputLabel htmlFor='course'>בחר קורס</InputLabel>
          <Select
            labelId='course'
            id='course'
            value={course}
            onChange={handleCourseChange}
            fullWidth
          >
            {courses.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl className='course-select'>
          <InputLabel htmlFor='misuv-week'>שבוע</InputLabel>
          <Select
            labelId='misuv-week'
            id='misuv-week'
            value={weekNumber}
            onChange={handleWeekChange}
            fullWidth
          >
            {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
              <MenuItem key={w} value={w}>
                שבוע {w}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className='class-reviews'>
          <h3>הוספה / עריכה</h3>
          {classReviews.map((review, index) => (
            <div key={index} className='review-card'>
              {editingIndex === index ? (
                <>
                  <FormControl className='review-type-select'>
                    <InputLabel htmlFor='review-type'>סוג</InputLabel>
                    <Select
                      labelId='review-type'
                      id='review-type'
                      value={editingReview.type}
                      onChange={handleReviewTypeChange}
                    >
                      {classReviewTypes.map(type => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    id='title'
                    label='כותרת'
                    className='title-select'
                    value={editingReview.title}
                    onChange={handleTitleChange}
                    variant='outlined'
                    fullWidth
                  />
                  <Button
                    className='add-review-button'
                    variant='contained'
                    color='primary'
                    onClick={handleAddReview}
                    disabled={!editingReview.type || !editingReview.title}
                  >
                    עדכן
                  </Button>
                </>
              ) : (
                <div className="review-container">
                  <div>
                    <div className='review-type'>{review.type}</div>
                    <div className='review-title'>{review.title}</div>
                  </div>
                  <div className='review-actions'>
                    <Button
                      variant='outlined'
                      color='primary'
                      onClick={() => handleEditReview(index)}
                    >
                      ערוך
                    </Button>
                    <Button
                      variant='outlined'
                      color='secondary'
                      onClick={() => handleDeleteReview(index)}
                    >
                      מחק
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className='review-row'>
            <FormControl className='review-type-select'>
              <InputLabel htmlFor='review-type'>סוג</InputLabel>
              <Select
                labelId='review-type'
                id='review-type'
                value={
                  editingIndex === -1 ? newReview.type : editingReview.type
                }
                onChange={handleReviewTypeChange}
              >
                {classReviewTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              id='title'
              label='כותרת'
              value={
                editingIndex === -1 ? newReview.title : editingReview.title
              }
              onChange={handleTitleChange}
              variant='outlined'
              fullWidth
            />
            <Button
              className='add-review-button'
              variant='contained'
              color='primary'
              onClick={handleAddReview}
              disabled={
                !(
                  (editingIndex === -1 ? newReview.type : editingReview.type) &&
                  (editingIndex === -1 ? newReview.title : editingReview.title)
                )
              }
            >
              {editingIndex === -1 ? 'הוסף' : 'עדכן'}
            </Button>
          </div>
        </div>
        <div className='daily-question'>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeDailyQuestion}
                onChange={handleIncludeDailyQuestionChange}
                color='primary'
              />
            }
            label='הוסף שאלה יומית'
          />
          {includeDailyQuestion && (
            <div>
              <label htmlFor='dailyQuestionText'>שאלה יומית:</label>
              <TextField
                className='daily-question'
                id='dailyQuestionText'
                label='שאלה יומית'
                value={dailyQuestion}
                onChange={handleDailyQuestionChange}
                variant='outlined'
                fullWidth
              />
            </div>
          )}
        </div>
        <div className='daily-question'>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeShareQuestion}
                onChange={handleIncludeShareQuestionChange}
                color='primary'
              />
            }
            label='הוסף שאלה לסיום: האם יש משהו שחשוב לך לשתף״'
          />
        </div>
        <Button
          className='submit-button'
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={
            !course ||
            weekNumber < 1 ||
            classReviews.length === 0 ||
            !selectedDate
          }
        >
          שלח
        </Button>
        {submitResponse ? <h3 className="form-container">
          {submitResponse}
        </h3>: <div/>}
      </div>
    </div>
  );
}

export default App;
