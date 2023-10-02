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


const api: string = 'http://127.0.0.1:80/api/submit';
const coursesApi: string = 'http://127.0.0.1:80/api/courses';
const reviewTypesApi: string = 'http://127.0.0.1:80/api/reviewTypes';

interface ClassReview {
  type: string;
  title: string;
}

function App() {
  const [course, setCourse] = useState<string>('');
  const [courses, setCourses] = useState<string[]>([]);
  const [classReviewTypes, setClassReviewTypes] = useState<string[]>([]);
  const [classReviews, setClassReviews] = useState<ClassReview[]>([]);
  const [newReview, setNewReview] = useState<ClassReview>({
    type: '',
    title: '',
  });
  const [dailyQuestion, setDailyQuestion] = useState<string>('');
  const [includeDailyQuestion, setIncludeDailyQuestion] =
    useState<boolean>(false);
  const [apiEndpoint, setApiEndpoint] = useState<string>(api);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingReview, setEditingReview] = useState<ClassReview>({
    type: '',
    title: '',
  });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [submitResponse, setSubmitResponse] = useState<string>('');

  useEffect(()=>{
    fetch(coursesApi, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(response => response.json())
      .then(data => {
        console.log(data)
        setCourses(data)
      })
      .catch(error => {
        setSubmitResponse(error.toString())
      });

      fetch(reviewTypesApi, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
        .then(response => response.json())
        .then(data => {
          console.log(data)
          setClassReviewTypes(data)
        })
        .catch(error => {
          setSubmitResponse(error.toString())
        });
  },[])
  const handleCourseChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setCourse(e.target.value as string);
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleSubmit = () => {
    setSubmitResponse("...Waiting for response")
    const dataToSend = {
      course,
      classReviews,
    };

    if (includeDailyQuestion && dailyQuestion) {
      dataToSend['dailyQuestion'] = dailyQuestion;
    }

    if (selectedDate) {
      dataToSend['selectedDate'] = selectedDate;
    }

    fetch(apiEndpoint, {
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
        <Button
          className='submit-button'
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={!course || classReviews.length === 0 || !selectedDate}
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
