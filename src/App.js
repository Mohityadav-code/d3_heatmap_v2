// src/App.js
import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2,} from 'lucide-react';
import HeatmapTable from "./HeatMap";
// backicon from lucide-react
import { ArrowLeft } from 'lucide-react';

const App = () => {
  const [people, setPeople] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('heatmap');

  useEffect(() => {
    const fetchPeopleAndDetails = async () => {
      try {
        const response = await fetch("https://forinterview.onrender.com/people");
        if (!response.ok) {
          throw new Error(`Error fetching people: ${response.statusText}`);
        }
        const data = await response.json();
        setLoadingPeople(false);

        // Fetch details for each person
        const peopleWithDetails = await Promise.all(
          data.map(async (person) => {
            const detailResponse = await fetch(`https://forinterview.onrender.com/people/${person.id}`);
            if (!detailResponse.ok) {
              throw new Error(`Error fetching details for ${person.name}: ${detailResponse.statusText}`);
            }
            const detailData = await detailResponse.json();
            return {
              ...person,
              ...detailData,
              totalScore: calculateTotalScore(detailData) // Changed from consensusScore to totalScore
            };
          })
        );

        console.log("peopleWithDetails", peopleWithDetails);
        
        // Create a copy before sorting to avoid mutating the original array
        const sortedPeople = [...peopleWithDetails].sort((a, b) => b.totalScore - a.totalScore);
        console.log("sortedPeople", sortedPeople);
        
        setPeople(sortedPeople);
        setLoadingDetails(false);
      } catch (err) {
        setError(err.message);
        setLoadingPeople(false);
        setLoadingDetails(false);
      }
    };

    fetchPeopleAndDetails();
  }, []);

  // Updated function to calculate total score
  const calculateTotalScore = (detailData) => {
    let totalScore = 0;
    detailData.data?.data?.skillset?.forEach(skillset => {
      skillset.skills?.forEach(skill => {
        skill.pos?.forEach(po => {
          if (po.consensus_score) {
            totalScore += po.consensus_score;
          }
        });
      });
    });
    return totalScore;
  };

  const toggleStudent = (student) => {
    setSelectedStudents(prev => 
      prev.find(s => s.id === student.id)
        ? prev.filter(s => s.id !== student.id)
        : [...prev, student]
    );
  };

  return (
    <div className="container mx-auto p-4">
        {/* Back to my jobs button here with text-[#919191]  */}
        <div className="flex items-center mb-6">
            <ArrowLeft className="text-[#919191] h-6 w-6" />
            <button className="text-[#919191] text-lg ml-2">Back to my jobs</button>
        </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl text-[#919191] font-bold">Posk_UXdesigner_sr001</h1>
        <h2 className="text-2xl text-[#575757] font-semibold">{selectedStudents.length} Candidates</h2>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="flex gap-10">
        <section className="w-1/3 border border-gray-700 overflow-hidden">
          <h2 className="text-2xl font-normal border-b border-gray-700 text-center py-4">Most Recommended</h2>
          {loadingPeople || loadingDetails ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <p>Loading candidates...</p>
            </div>
          ) : (
            <ul className="">
              {people.map((person, index) => {
                const isSelected = selectedStudents.some(s => s.id === person.id);
                const isTopFive = index < 5;

                return (
                  <React.Fragment key={person.id}>
                    {/* Insert separator after top 5 users */}
                    {index === 5 && (
                      <li
                        key="separator"
                        className="p-4 bg-blue-50 text-center text-sm"
                      >
                        Recommendations are based on your skill requirements and candidates' performance.
                      </li>
                    )}
                    
                    <li
                      className={`flex items-center justify-between px-4 py-4 cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? "bg-[#F6F6EF] border-l-4 "
                          : isTopFive
                          ? "bg-[#ffffff] hover:bg-gray-100"
                          : "hover:bg-gray-100 border-0"
                      }`}
                      onClick={() => toggleStudent(person)}
                    >
                      <span className={`${isSelected ? "font-semibold" : ""}`}>
                        {person.name}
                      </span>
                      {isSelected ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : (
                        <Plus className="w-5 h-5 text-blue-500" />
                      )}

                    </li>
                    <hr className=' mx-3 border-gray-700' />
                  </React.Fragment>
                );
              })}
            </ul>
          )}
        </section>

        <section className="w-full">
          {/* Create three buttons with styling */}
          <div className="flex justify-between items-center border-gray-700 border-b w-full">
            <div className='flex items-center'>
              <button
                className={`px-5 py-2 border border-gray-700 -mb-[1px] ${activeTab === 'heatmap' ? 'bg-[#38A164] text-white' : ''}`}
                onClick={() => setActiveTab('heatmap')}
              >
Compare View

              </button>
              <button
              disabled
                className={`px-5 py-2 border border-gray-700 -mb-[1px] cursor-not-allowed  ${activeTab === 'table' ? 'bg-[#38A164] text-white' : ''}`}
                onClick={() => setActiveTab('table')}
              >
Individual view
              </button>
              <button
              disabled

                className={`px-5 py-2 border border-gray-700 -mb-[1px] cursor-not-allowed  ${activeTab === 'graph' ? 'bg-[#38A164] text-white' : ''}`}
                onClick={() => setActiveTab('graph')}
              >

Shortlisted candidates
              </button>
            </div>
          </div>

          {/* Render content based on active tab */}
          {
            activeTab === 'heatmap' ? (
              <HeatmapTable
                students={selectedStudents}
                removeStudent={toggleStudent}
              />
            ) : (
              <div>Not yet developed</div>
            )
          }
        </section>
      </div>
    </div>
  );
};

export default App;
