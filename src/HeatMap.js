
// src/HeatmapTable.js
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './HeatmapTable.css'; // Ensure you have appropriate CSS for styling

const HeatmapTable = ({ students, removeStudent }) => {
    console.log(students)
  const svgRef = useRef();
  const tooltipRef = useRef();
  const containerRef = useRef(); // Ref to the container

  // State for tooltip
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    type: 'label', // 'label' or 'cell'
  });


  // Custom color scale based on specific score ranges
  const getColor = (score) => {
    if (score >= 3.5) return '#003F0B'; // Darkest green
    if (score >= 2.5) return '#199741'; // Hard green
    if (score >= 1.5) return '#A6D96A'; // Normal green
    if (score >= 0.5) return '#F9F8A6'; // Yellow
    return '#FFFFFF'; // White
  };

  useEffect(() => {
    if (!students || students.length === 0) return;

    // Prepare the data
    // Extract all unique skills across selected students
    const allSkillsSet = new Set();

    // Add the special rows
    const specialRows = ['Experience'];
    specialRows.forEach(row => allSkillsSet.add(row));

    // Process skill data
    const skillsData = students.map((student) => {
      const skillsets = student.data.data.skillset || [];
      const skills = skillsets.flatMap((skillset) => {
        return skillset.skills.map((skill) => {
          allSkillsSet.add(skill.name);
          // Assuming the first pos entry contains the consensus_score
          const consensus_score = skill.pos && skill.pos.length > 0 ? skill.pos[0].consensus_score : 0;
          const studentNameParts = student.name.split(" ");
          const updatedName = studentNameParts[0] + " " + (studentNameParts[1]?.charAt(0) || '');
          return {
            student: updatedName,
            skill: skill.name,
            score: consensus_score,
          };
        });
      });
      return skills;
    }).flat();

    const allSkills = ['Experience', ...Array.from(allSkillsSet).filter(skill => !specialRows.includes(skill))];

    // Pivot the data to have skills as rows and students as columns
    const pivotData = allSkills.map((skill) => {
      const row = { skill };
      students.forEach((student) => {
        if (skill === 'Experience') {
          // Calculate work experience
          const workEx = student.data.user_data.user.workEx || [];
          const totalMonths = workEx.reduce((acc, job) => {
            const start = new Date(job.start_date);
            const end = new Date(job.end_date);
            const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            return acc + months;
          }, 0);
          const experience = (totalMonths / 12).toFixed(1);
          row[student.name] = experience;
        } else {
          // Handle skill scores
          const skillData = student.data.data.skillset
            ?.flatMap((skillset) => skillset.skills)
            .find((s) => s.name === skill);
          const score = skillData?.pos && skillData.pos.length > 0 ? skillData.pos[0].consensus_score : 0;
          row[student.name] = score;
        }
      });
      return row;
    });

    // Compute totalScores per student (excluding 'Experience')
    const totalScores = {};
    students.forEach((student) => {
      const totalScore = pivotData.reduce((sum, row) => {
        if (row.skill === 'Experience') return sum;
        const score = row[student.name];
        return sum + (typeof score === 'number' ? score : 0);
      }, 0);
      totalScores[student.name] = totalScore.toFixed(2); // Rounded to 2 decimal places
    });

    // Set dimensions
    const margin = { top: 60, right: 50, bottom: 50, left: 290 };
    const cellWidth = 50; // Width for rectangular cells
    const cellHeight = 35; // Height for rectangular cells
    const width = cellWidth * students.length + margin.left + margin.right;
    const height = cellHeight * allSkills.length + margin.top + margin.bottom;

    // Select the SVG element
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous contents

    svg
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
 
    // Add skill labels (rows) place them on left side text -left
    g.selectAll('.skill-label')
      .data(allSkills)
      .enter()
      .append('text')
      .attr('class', 'skill-label')
      .attr('x', -290)
      .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'end')
      .text(d => d)
      .style('font-weight', d => specialRows.includes(d) ? 'bold' : 'normal')
      .style('font-size', d => specialRows.includes(d) ? '17px' : '16px')
        // text position left means start from left side 
    .style('text-anchor', 'start'); // Align text to the right

    // Add student labels (columns)
    g.selectAll('.student-label')
      .data(students)
      .enter()
      .append('text')
      .attr('class', 'student-label')
      .attr('x', (d, i) => i * cellWidth + cellWidth / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .text(d => {
        const names = d.name.split(" ");
        const firstInitial = names[0]?.charAt(0) || "";
        const secondInitial = names[1]?.charAt(0) || "";
        return `${firstInitial}.${secondInitial}`;
      })
      .style('font-weight', 'bold')
      .style('font-size', '12px')
      .style('cursor', 'pointer')
    //   rotate 45 degree
        .attr('transform', (d, i) => {
            const x = i * cellWidth + cellWidth / 2;
            const y = -20;
            const angle = -45; // Tilt angle in degrees (negative for counter-clockwise)
            return `rotate(${angle}, ${x}, ${y})`;
            })
      .on('mouseover', (event, d) => {
        // Show Total Score and set tooltip type to 'label'
        const totalScore = totalScores[d.name] || 0;

        setTooltip({
          visible: true,
          x: 0, // Will be set in 'mousemove'
          y: 0,
          content: `Total Score: ${totalScore}`,
          type: 'label',
        });
      })
      .on('mousemove', (event, d) => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();

        const x = event.clientX - containerRect.left + 10; // 10px offset to the right
        const y = event.clientY - containerRect.top - 10; // 10px offset above

        setTooltip(prev => ({
          ...prev,
          x: x,
          y: y,
        }));
      })
      .on('mouseout', () => {
        setTooltip(prev => ({
          ...prev,
          visible: false,
        }));
      })
      .on('click', (event, d) => {
        // Handle student removal on label click
        if (window.confirm(`Remove ${d.name} from selected students?`)) {
          removeStudent(d.id);
        }
      });

    // Draw cells with hover functionality
    pivotData.forEach((d, rowIndex) => {
      students.forEach((student, colIndex) => {
        const score = d[student.name];
        const isSpecial = specialRows.includes(d.skill);

        const cellGroup = g.append('g') // Group for each cell to manage events and texts add some space between cells
          .attr('class', 'cell-group')
          .attr('transform', `translate(${colIndex * cellWidth}, ${rowIndex * cellHeight})`)

        // Append rectangle
        cellGroup.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', cellWidth - 4) // Subtracting 2 for spacing
          .attr('height', cellHeight - 4)
          .attr('fill', isSpecial ? '#E8F5EE' : getColor(score))
          .style('cursor', 'pointer') // Change cursor to pointer on hover
          .on('mouseover', (event) => {
            // Determine content based on whether it's a special row
            const content = isSpecial
              ? `${d.skill}: ${score}`
              : `Skill: ${d.skill}\nScore: ${score}`;

            // Calculate position inside the cell
            const x = (cellWidth - 2) / 2;
            const y = (cellHeight - 2) / 2;

            // setTooltip({
            //   visible: true,
            //   x: x + colIndex * cellWidth + margin.left,
            //   y: y + rowIndex * cellHeight + margin.top,
            //   content: content,
            //   type: 'cell',
            // });

            // Show the skill score inside the box if it's not a special row
            if (!isSpecial) {
              cellGroup.select('text.skill-score')
                .transition()
                .duration(200)
                .style('opacity', 1);
            }
          })
          .on('mousemove', (event) => {
            if (!containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();

            const x = event.clientX - containerRect.left + 10; // 10px offset to the right
            const y = event.clientY - containerRect.top - 10; // 10px offset above

            setTooltip(prev => ({
              ...prev,
              x: x,
              y: y,
            }));
          })
          .on('mouseout', (event) => {
            setTooltip(prev => ({
              ...prev,
              visible: false,
            }));

            // Hide the skill score inside the box if it's not a special row
            if (!isSpecial) {
              cellGroup.select('text.skill-score')
                .transition()
                .duration(200)
                .style('opacity', 0);
            }
          });

        // Append text inside cells
        cellGroup.append('text')
          .attr('class', isSpecial ? 'skill-text' : 'skill-score') // Different classes for styling
          .attr('x', (cellWidth - 2) / 2)
          .attr('y', (cellHeight - 2) / 2)
          .attr('dy', '.35em')
          .attr('text-anchor', 'middle')
          .text(() => {
            if (isSpecial) {
              return d.skill === 'Experience' ? `${score}` : '';
            } else {
              return `${score}`;
            }
          })
          .style('font-size', '10px')
          .style('pointer-events', 'none')
        //   text color if score is less than 2 then black else white if special row then show else show black
            .style('fill', isSpecial ? '#000' : score < 2 ? '#000' : '#fff')
          .style('opacity', isSpecial ? 1 : 0); // Show only for special rows initially
      });
    });

    // Cleanup tooltip on unmount
    return () => {
      setTooltip({
        visible: false,
        x: 0,
        y: 0,
        content: '',
        type: 'label',
      });
    };
  }, [students, removeStudent]);

  if (students.length === 0) {
    return (
      <section  className=' w-full h-full flex justify-center items-center text-lg font-semibold '>
        <p>No students selected.</p>
      </section>
    );
  }

  return (
    <section ref={containerRef} style={{ position: 'relative' }}>
      <svg ref={svgRef}></svg>
      {tooltip.visible && (
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{
            position: 'absolute',
            top: tooltip.y,
            left: tooltip.x,
            transform: tooltip.type === 'label' ? 'translate(0, -100%)' : 'translate(-50%, -100%)', // Adjust based on type
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '5px 10px',
            borderRadius: '4px',
            pointerEvents: 'none',
            whiteSpace: 'pre-line', // To handle newline characters
            fontSize: '12px',
            zIndex: 10,
            maxWidth: '200px',
          }}
        >
          {tooltip.content}
        </div>
      )}
    </section>
  );
};

export default HeatmapTable;
